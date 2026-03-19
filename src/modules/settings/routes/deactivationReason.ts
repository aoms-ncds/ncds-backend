import {Router} from 'express';
import {MongoError} from 'mongodb';
import authCheck from '../../../extras/auth_check';
import {sendStandardResponse} from '../../../extras/helpers';
import CommonLifeCycleStates from '../../../extras/CommonLifeCycleStates';
import Reason, {IReason} from '../models/deactivationReason';

const reasonRouter = Router();

reasonRouter.get('/', authCheck(['READ_ACCESS']), async (req, res, next) => {
  try {
    const data=await Reason.find();


    sendStandardResponse<IReason[]>(res, 'OK', {
      data: await Reason.find({}),
      message: 'Successfully fetched list of Reason',
    });
  } catch (error) {
    next(error);
  }
});

reasonRouter.get('/count', authCheck(['READ_ACCESS']), async (req, res, next) => {
  try {
    sendStandardResponse<number>(res, 'OK', {
      data: await Reason.countDocuments(),
      message: 'Successfully fetched list of Reason',
    });
  } catch (error) {
    next(error);
  }
});

reasonRouter.post(
  '/',
  authCheck(['READ_ACCESS']),
  async (req, res, next) => {
    try {
      const reason = new Reason({...req.body, status: CommonLifeCycleStates.ACTIVE});
      //   await reason.validate();
      sendStandardResponse(res, 'OK', {
        data: await reason.save(),
        message: 'Successfully added new reason',
      });
    } catch (error) {
      if (error instanceof MongoError && error.code === 11000) {
        // Duplicate entry error
        return sendStandardResponse(res, 'CONFLICT', {
          error: 'Duplicate entry error',
          message: 'Another reason with the same name already exists!',
        });
      }
      next(error);
    }
  },
);

reasonRouter.get(
  '/:reasonId',
  authCheck(['READ_ACCESS']),
  async (req, res, next) => {
    try {
      sendStandardResponse<IReason | null>(res, 'OK', {
        data: await Reason.findById(req.params.reasonId),
        message: 'Successfully fetched reason',
      });
    } catch (error) {
      next(error);
    }
  },
);

reasonRouter.patch(
  '/:reasonId',
  authCheck(['READ_ACCESS']),
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
      const previousReason = await Reason.findById(
        req.params.reasonId,
      );
      const newReason = await Reason.findByIdAndUpdate(
        req.params.reasonId,
        req.body,
        {new: true},
      );
      if (!previousReason || !newReason) {
        return next(new Error('Reason ID Not found'));
      }

      sendStandardResponse(res, 'OK', {
        data: newReason,
        message: 'Successfully updated Reason',
      });
    } catch (error) {
      next(error);
    }
  },
);

reasonRouter.delete(
  '/:reasonId',
  authCheck(['READ_ACCESS']),
  async (req, res, next) => {
    try {
      const reason = await Reason.findOneAndUpdate(
        {_id: req.params.reasonId},
        {new: true},
      );
      if (!reason) {
        return next(new Error('reason ID Not found'));
      }
      sendStandardResponse(res, 'OK', {
        data: reason,
        message: 'Successfully deleted reason',
      });
    } catch (error) {
      next(error);
    }
  },
);

reasonRouter.delete(
  '/:reasonId/force',
  authCheck(['READ_ACCESS']),
  async (req, res, next) => {
    try {
      const reason = await Reason.findOneAndDelete({
        _id: req.params.reasonId,
      });
      if (!reason) {
        return next(new Error('reason ID Not found'));
      }
      sendStandardResponse(res, 'OK', {
        data: reason,
        message: 'Successfully force deleted reason',
      });
    } catch (error) {
      next(error);
    }
  },
);

export default reasonRouter;
