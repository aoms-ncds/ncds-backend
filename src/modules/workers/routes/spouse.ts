import {Router} from 'express';
import authCheck from '../../../extras/auth_check';
import {sendStandardResponse} from '../../../extras/helpers';
import Spouse, {ISpouse} from '../models/Spouse';
import CommonLifeCycleStates from '../../../extras/CommonLifeCycleStates';
import {FilterQuery, Types} from 'mongoose';
// import workerEvents from '../events/workers_events';
import WorkerLifeCycleStates from '../extras/WorkerLifeCycleStates';
import Worker from '../models/Worker';

const spouseRouter = Router();
spouseRouter.get('/count', authCheck(['READ_ACCESS']), async (req, res, next) => {
  try {
    const conditions: FilterQuery<ISpouse> = {
      status: WorkerLifeCycleStates.ACTIVE, // Default to active status
    };
    if (Object.keys(req.query).includes('status')) {
      conditions.status = Number(req.query.status);
    }
    if (res.locals.authUser.kind == 'worker') {
      conditions.division = res.locals.authUser.division;
    }
    const worker = await Spouse.countDocuments(conditions);
    sendStandardResponse<number>(res, 'OK', {
      data: worker,
      message: 'Successfully fetched list of Spouse',
    });
  } catch (error) {
    next(error);
  }
});
spouseRouter.get('/', authCheck(['READ_WORKERS']), async (req, res, next) => {
  try {
    const conditions: FilterQuery<ISpouse> = {
      status: CommonLifeCycleStates.ACTIVE, // Default to active status
    };

    if (Object.keys(req.query).includes('status')) {
      conditions.status = Number(req.query.status);
    }
    if (res.locals.authUser.kind=='worker') {
      conditions.division = res.locals.authUser.division;
    }


    sendStandardResponse<ISpouse[]>(res, 'OK', {
      data: await Spouse.find(conditions).populate('spouseOf').populate('division'),
      message: 'Successfully fetched list Spouse',
    });
  } catch (error) {
    next(error);
  }
});

spouseRouter.patch(
  '/:spouseId/:operation',
  authCheck(['MANAGE_WORKER']),
  async (req, res, next) => {
    try {
      const reason = req.body.reason;
      console.log(reason, 'ress');

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
      const spouse = await Spouse.findByIdAndUpdate(
        req.params.spouseId,
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


      if (!spouse) {
        return next(new Error('spouseId ID Not found'));
      }

      sendStandardResponse(res, 'OK', {
        data: spouse,
        message: `Successfully ${req.params.operation}d Spouse`,
      });
    } catch (error) {
      next(error);
    }
  },
);
spouseRouter.delete(
  '/:spouseId/:deleteSpouse',
  authCheck(['ADMIN_ACCESS']),
  async (req, res, next) => {
    try {
      await Spouse.deleteOne({_id: req.params.spouseId});
      const data = await Worker.updateOne(
        {spouse: new Types.ObjectId(req.params.spouseId)}, // Find worker by spouse
        {$unset: {spouse: ''}}, // Unset the spouse field

      );
      console.log(data, 'data');
      sendStandardResponse(res, 'OK', {
        data: 'spouse',
        message: 'Successfully deleted Spouse',
      });
    } catch (error) {
      next(error);
    }
  },
);

export default spouseRouter;
