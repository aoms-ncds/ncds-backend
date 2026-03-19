import {Router} from 'express';
import CommonLifeCycleStates from '../../../extras/CommonLifeCycleStates';
import authCheck from '../../../extras/auth_check';
import {sendStandardResponse} from '../../../extras/helpers';
import Child, {IChild} from '../models/Child';
import {FilterQuery, Types} from 'mongoose';
import WorkerLifeCycleStates from '../extras/WorkerLifeCycleStates';
import Worker from '../models/Worker';

const childrenRouter = Router();
childrenRouter.get('/count', authCheck(['READ_ACCESS']), async (req, res, next) => {
  try {
    const conditions: FilterQuery<IChild> = {
      status: WorkerLifeCycleStates.ACTIVE, // Default to active status
    };
    if (Object.keys(req.query).includes('status')) {
      conditions.status = Number(req.query.status);
    }
    if (res.locals.authUser.kind == 'worker') {
      conditions.division = res.locals.authUser.division;
    }
    const worker = await Child.countDocuments(conditions);
    sendStandardResponse<number>(res, 'OK', {
      data: worker,
      message: 'Successfully fetched list of Child',
    });
  } catch (error) {
    next(error);
  }
});
childrenRouter.get('/', authCheck(['READ_WORKERS']), async (req, res, next) => {
  try {
    const conditions: FilterQuery<IChild> = {
      status: CommonLifeCycleStates.ACTIVE, // Default to active status
    };

    if (Object.keys(req.query).includes('status')) {
      conditions.status = Number(req.query.status);
    }
    if (res.locals.authUser.kind == 'worker') {
      conditions.division = res.locals.authUser.division;
    }
    if (Object.keys(req.query).includes('division')) {
      conditions.division = req.query.division;
    }
    console.log({conditions});
    const data = await Child.find(conditions)
      .populate('childOf')
      .populate('childSupport')
      .populate('division')
      .populate([
        {
          path: 'childOf',
          populate: {
            path: 'officialDetails', // Populate officialDetails inside childOf
            populate: {
              path: 'divisionHistory', // Populate divisionHistory inside officialDetails
              populate: {
                path: 'subDivision', // Finally, populate subDivision inside divisionHistory
                model: 'sub_divisions',
              },
            },
          },
        },
      ])

      .populate({
        path: 'childOf',
        populate: {
          path: 'supportDetails',
          populate: {
            path: 'designation',
            model: 'designations',
          },
        },
      }).exec();
    const sortedData = data.sort((a:any, b:any) => {
      const firstNameA = a.childOf?.basicDetails?.firstName || '';
      const firstNameB = b.childOf?.basicDetails?.firstName || '';
      return firstNameA.localeCompare(firstNameB);
    });
    sendStandardResponse<IChild[]>(res, 'OK', {
      data: sortedData,
      message: 'Successfully fetched list of Childrens',
    });
  } catch (error) {
    next(error);
  }
});

childrenRouter.patch(
  '/:childId/:operation',
  authCheck(['MANAGE_WORKER']),
  async (req, res, next) => {
    try {
      const reason = req.body.reason;
      if (
        !['activate', 'deactivate'].includes(
          req.params.operation,
        )
      ) {
        next(
          new Error(
            'Only activate/deactivate operations are allowed by this API endpoint!',
          ),
        );
      }
      // eslint-disable-next-line no-unused-vars
      const child = await Child.findByIdAndUpdate(
        req.params.childId,
        {
          $set: {
            status:
              req.params.operation === 'activate' ?
                WorkerLifeCycleStates.ACTIVE :
                WorkerLifeCycleStates.INACTIVE,
            ...(req.params.operation !== 'activate' && {
              'reasonForDeactivation': reason,
              'deactivationDate': new Date(),
            }),
            ...(req.params.operation == 'activate' && {
              'reasonForDeactivation': '',
              'deactivationDate': null,
            }),
          },
        },
        {new: true},
      );

      if (!child) {
        return next(new Error('childId ID Not found'));
      }

      sendStandardResponse(res, 'OK', {
        data: child,
        message: `Successfully ${req.params.operation}d Child`,
      });
      // if (req.params.operation === 'activate') {
      //   workerEvents.emit('activate', {data: spouse});
      // } else {
      //   workerEvents.emit('deactivate', {data: spouse});
      // }
    } catch (error) {
      next(error);
    }
  },
);
childrenRouter.get(
  '/:childId',
  authCheck(['MANAGE_WORKER']),
  async (req, res, next) => {
    try {
      console.log(req.params.childId);
      // eslint-disable-next-line no-unused-vars
      const child = await Child.findOne({_id: req.params.childId});

      if (!child) {
        return next(new Error('childId ID Not found'));
      }

      sendStandardResponse(res, 'OK', {
        data: child,
        message: `Successfully ${req.params.operation}d Child`,
      });
      // if (req.params.operation === 'activate') {
      //   workerEvents.emit('activate', {data: spouse});
      // } else {
      //   workerEvents.emit('deactivate', {data: spouse});
      // }
    } catch (error) {
      next(error);
    }
  },
  childrenRouter.delete(
    '/:childID/:deleteChild',
    authCheck(['ADMIN_ACCESS']),
    async (req, res, next) => {
      try {
        await Child.deleteOne({_id: req.params.childID});
        const data = await Worker.updateOne(
          {children: new Types.ObjectId(req.params.childID)}, // Find worker containing this child
          {$pull: {children: new Types.ObjectId(req.params.childID)}}, // Remove the child from the array
        );
        console.log(data, 'data');
        sendStandardResponse(res, 'OK', {
          data: 'child',
          message: 'Successfully deleted child',
        });
      } catch (error) {
        next(error);
      }
    },
  ),
);

export default childrenRouter;
