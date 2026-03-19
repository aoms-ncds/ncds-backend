import {Router} from 'express';
import {MongoError} from 'mongodb';
import authCheck from '../../../extras/auth_check';
import {sendStandardResponse} from '../../../extras/helpers';
import CommonLifeCycleStates from '../../../extras/CommonLifeCycleStates';
import LeaderDetails, {ILeaderDetails} from '../models/leaderDetails';
import mongoose from 'mongoose';
import TransactionLog from '../../FR/models/transactionLog';


const leaderDetails = Router();

leaderDetails.get('/', authCheck(['READ_ACCESS']), async (req, res, next) => {
  try {
    sendStandardResponse<ILeaderDetails[]>(res, 'OK', {
      data: await LeaderDetails.find().sort({order: 1}),
      message: 'Successfully fetched list of LeaderDetails',
    });
  } catch (error) {
    next(error);
  }
});
leaderDetails.get('/count', authCheck(['READ_ACCESS']), async (req, res, next) => {
  try {
    sendStandardResponse<number>(res, 'OK', {
      data: await LeaderDetails.countDocuments(),
      message: 'Successfully fetched list of LeaderDetails',
    });
  } catch (error) {
    next(error);
  }
});

leaderDetails.post(
  '/',
  authCheck(['READ_ACCESS']),
  async (req, res, next) => {
    try {
      const leaderDetails = new LeaderDetails({...req.body});
      await leaderDetails.validate();
      sendStandardResponse(res, 'OK', {
        data: await leaderDetails.save(),
        message: 'Successfully added new leaderDetils',
      });
    } catch (error) {
      if (error instanceof MongoError && error.code === 11000) {
        // Duplicate entry error
        return sendStandardResponse(res, 'CONFLICT', {
          error: 'Duplicate entry error',
          message: 'Another label with the same name already exists!',
        });
      }
      next(error);
    }
  },
);

leaderDetails.get(
  '/:labelId',
  authCheck(['READ_ACCESS']),
  async (req, res, next) => {
    try {
      sendStandardResponse<ILeaderDetails | null>(res, 'OK', {
        data: await LeaderDetails.findById(req.params.labelId),
        message: 'Successfully fetched label',
      });
    } catch (error) {
      next(error);
    }
  },
);

leaderDetails.patch(
  '/:labelId',
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
      const previouslabel = await LeaderDetails.findById(
        req.params.labelId,
      );
      const newlabel = await LeaderDetails.findByIdAndUpdate(
        req.params.labelId,
        req.body,
        {new: true},
      );
      if (!previouslabel || !newlabel) {
        return next(new Error('LeaderDetails ID Not found'));
      }
      await new TransactionLog({
        TRNo: newlabel._id,
        TRId: new mongoose.Types.ObjectId(req.params.IROId),
        action: 'Leader details edited', // Or 'Modified' depending on your use case
        type: 'settings',
        doneBy: res.locals.authUser._id,
        // message: logMessage.toString(),
      }).save();
      sendStandardResponse(res, 'OK', {
        data: newlabel,
        message: 'Successfully updated LeaderDetails',
      });
    } catch (error) {
      next(error);
    }
  },
);

leaderDetails.delete(
  '/:labelId',
  authCheck(['READ_ACCESS']),
  async (req, res, next) => {
    try {
      const label = await LeaderDetails.findOneAndUpdate(
        {_id: req.params.labelId},
        {status: CommonLifeCycleStates.DELETED},
        {new: true},
      );
      if (!label) {
        return next(new Error('label ID Not found'));
      }
      sendStandardResponse(res, 'OK', {
        data: label,
        message: 'Successfully deleted label',
      });
    } catch (error) {
      next(error);
    }
  },
);

leaderDetails.delete(
  '/:labelId/force',
  authCheck(['READ_ACCESS']),
  async (req, res, next) => {
    try {
      const label = await LeaderDetails.findOneAndDelete({
        _id: req.params.labelId,
      });
      if (!label) {
        return next(new Error('label ID Not found'));
      }
      sendStandardResponse(res, 'OK', {
        data: label,
        message: 'Successfully force deleted label',
      });
    } catch (error) {
      next(error);
    }
  },
);

export default leaderDetails;
