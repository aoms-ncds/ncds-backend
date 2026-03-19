import {Router} from 'express';
import {MongoError} from 'mongodb';
import authCheck from '../../../extras/auth_check';
import {sendStandardResponse} from '../../../extras/helpers';
import ChildSupport, {IChildSupport} from '../models/childSupport';
import childSupportEvents from '../events/childSupport_events';
import CommonLifeCycleStates from '../../../extras/CommonLifeCycleStates';
import ChildSupportAge, {IChildSupportAge} from '../models/childSupportAge';

const childSupportRouter = Router();


childSupportRouter.get('/count', authCheck(['READ_WORKERS']), async (req, res, next) => {
  try {
    const conditions: Partial<IChildSupport> = {
      status: CommonLifeCycleStates.ACTIVE, // Default to active status
    };

    if (Object.keys(req.query).includes('status')) {
      conditions.status = Number(req.query.status);
    }

    sendStandardResponse<number>(res, 'OK', {
      data: await ChildSupport.countDocuments(conditions),
      message: 'Successfully fetched list of ChildSupport',
    });
  } catch (error) {
    next(error);
  }
});
childSupportRouter.patch('/editChaildAgeLimit', authCheck(['READ_WORKERS']),
  async (req, res, next) => {
    try {
      console.log(req.body.age, 'age');

      const age = await ChildSupportAge.findOne();
      if (age !==null) {
        sendStandardResponse<IChildSupportAge | undefined>(res, 'OK', {
          data: age,
          message: 'Successfully fetched childSupport',
        });
      }
    } catch (error) {
      next(error);
    }
  },
);
childSupportRouter.get('/', authCheck(['READ_WORKERS']), async (req, res, next) => {
  try {
    const conditions: Partial<IChildSupport> = {};
    conditions.status = CommonLifeCycleStates.ACTIVE;
    if (Object.keys(req.query).includes('status')) {
      conditions.status = Number(req.query.status);
    }


    sendStandardResponse<IChildSupport[]>(res, 'OK', {
      data: await ChildSupport.find(conditions).sort({name: 'asc'}),
      message: 'Successfully fetched list of Child Supports',
    });
  } catch (error) {
    next(error);
  }
});

childSupportRouter.post(
  '/',
  authCheck(['MANAGE_WORKER']),
  async (req, res, next) => {
    try {
      const childSupport = new ChildSupport({...req.body, status: CommonLifeCycleStates.ACTIVE});
      await childSupport.validate();
      sendStandardResponse(res, 'OK', {
        data: await childSupport.save(),
        message: 'Successfully added new child Support',
      });
      childSupportEvents.emit('create', {data: childSupport});
    } catch (error) {
      if (error instanceof MongoError && error.code === 11000) {
        // Duplicate entry error
        return sendStandardResponse(res, 'CONFLICT', {
          error: 'Duplicate entry error',
          message: 'Another childsupport with the same name already exists!',
        });
      }
      next(error);
    }
  },
);


childSupportRouter.get('/getAge', authCheck(['READ_WORKERS']),
  async (req, res, next) => {
    try {
      console.log(req.body, 'age');
      const newAge = await ChildSupportAge.findOne({});


      sendStandardResponse<IChildSupportAge | null>(res, 'OK', {
        data: newAge,
        message: 'Successfully fetched age',
      });
    } catch (error) {
      next(error);
    }
  },
);


childSupportRouter.get(
  '/:childSupportId',
  authCheck(['READ_WORKERS']),
  async (req, res, next) => {
    try {
      sendStandardResponse<IChildSupport | null>(res, 'OK', {
        data: await ChildSupport.findById(req.params.childSupportId),
        message: 'Successfully fetched childSupport',
      });
    } catch (error) {
      next(error);
    }
  },
);

childSupportRouter.patch(
  '/:childSupportId',
  authCheck(['MANAGE_WORKER']),
  async (req, res, next) => {
    try {
      if (
        Object.keys(req.body).includes('activate') ||
        Object.keys(req.body).includes('deactivate')
      ) {
        next(
          new Error(
            'activate and deactivate fields are allowed by this API endpoint!',
          ),
        );
      }
      const previousChildSupport = await ChildSupport.findById(
        req.params.childSupportId,
      );
      const newChildSupport = await ChildSupport.findByIdAndUpdate(
        req.params.childSupportId,
        req.body,
        {new: true},
      );
      if (!previousChildSupport || !newChildSupport) {
        return next(new Error('ChildSupport ID Not found'));
      }

      sendStandardResponse(res, 'OK', {
        data: newChildSupport,
        message: 'Successfully updated ChildSupport',
      });
      childSupportEvents.emit('update', {data: {
        previousChildSupport,
        newChildSupport,
      }} );
    } catch (error) {
      next(error);
    }
  },
);

childSupportRouter.delete(
  '/:childSupportId',
  authCheck(['MANAGE_WORKER']),
  async (req, res, next) => {
    try {
      const childSupport = await ChildSupport.findOneAndUpdate(
        {_id: req.params.childSupportId},
        {status: -1},
        {new: true},
      );
      if (!childSupport) {
        return next(new Error('childSupport ID Not found'));
      }
      sendStandardResponse(res, 'OK', {
        data: childSupport,
        message: 'Successfully deleted childSupport',
      });
      childSupportEvents.emit('delete', {data: childSupport});
    } catch (error) {
      next(error);
    }
  },
);

childSupportRouter.delete(
  '/:childSupportId/force',
  authCheck(['MANAGE_WORKER']),
  async (req, res, next) => {
    try {
      const childSupport = await ChildSupport.findOneAndDelete({
        _id: req.params.childSupportId,
      });
      if (!childSupport) {
        return next(new Error('childSupport ID Not found'));
      }
      sendStandardResponse(res, 'OK', {
        data: childSupport,
        message: 'Successfully force deleted childSupport',
      });
      // childSupportEvents.emit('forceDelete', {data: childSupport});
    } catch (error) {
      next(error);
    }
  },
);

export default childSupportRouter;
