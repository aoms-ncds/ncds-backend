import {Router} from 'express';
import {MongoError} from 'mongodb';
import authCheck from '../../../extras/auth_check';
import {sendStandardResponse} from '../../../extras/helpers';
import SanctionedAsPer, {IasPer} from '../models/sanctionedAsPer';

const sanctiondAsPerRouter = Router();

sanctiondAsPerRouter.get('/', authCheck(['READ_ACCESS']), async (req, res, next) => {
  try {
    const data=await SanctionedAsPer.find();


    sendStandardResponse<IasPer[]>(res, 'OK', {
      data: await SanctionedAsPer.find({}),
      message: 'Successfully fetched list of Reason',
    });
  } catch (error) {
    next(error);
  }
});

sanctiondAsPerRouter.get('/count', authCheck(['READ_ACCESS']), async (req, res, next) => {
  try {
    sendStandardResponse<number>(res, 'OK', {
      data: await SanctionedAsPer.countDocuments(),
      message: 'Successfully fetched list of Reason',
    });
  } catch (error) {
    next(error);
  }
});

sanctiondAsPerRouter.post(
  '/',
  authCheck(['READ_ACCESS']),
  async (req, res, next) => {
    try {
      const asper = new SanctionedAsPer({...req.body});
      //   await reason.validate();
      sendStandardResponse(res, 'OK', {
        data: await asper.save(),
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

sanctiondAsPerRouter.get(
  '/:reasonId',
  authCheck(['READ_ACCESS']),
  async (req, res, next) => {
    try {
      sendStandardResponse<IasPer | null>(res, 'OK', {
        data: await SanctionedAsPer.findById(req.params.reasonId),
        message: 'Successfully fetched reason',
      });
    } catch (error) {
      next(error);
    }
  },
);

sanctiondAsPerRouter.patch(
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
      const previousReason = await SanctionedAsPer.findById(
        req.params.reasonId,
      );
      const newReason = await SanctionedAsPer.findByIdAndUpdate(
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

sanctiondAsPerRouter.delete(
  '/:reasonId',
  authCheck(['READ_ACCESS']),
  async (req, res, next) => {
    try {
      const reason = await SanctionedAsPer.findOneAndUpdate(
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

sanctiondAsPerRouter.delete(
  '/:reasonId/force',
  authCheck(['READ_ACCESS']),
  async (req, res, next) => {
    try {
      const asPer = await SanctionedAsPer.findOneAndDelete({
        _id: req.params.reasonId,
      });
      if (!asPer) {
        return next(new Error('asPer ID Not found'));
      }
      sendStandardResponse(res, 'OK', {
        data: asPer,
        message: 'Successfully force deleted reason',
      });
    } catch (error) {
      next(error);
    }
  },
);

export default sanctiondAsPerRouter;
