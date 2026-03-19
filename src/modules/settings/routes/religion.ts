import {Router} from 'express';
import authCheck from '../../../extras/auth_check';
import {sendStandardResponse} from '../../../extras/helpers';
import {MongoError} from 'mongodb';
import Religion, {IReligion} from '../models/religion';

/**
 * For Adding new religion
 * [POST] /settings/Gender/
 *
 * @author <@ShibinSk>
 *
 */


const religionRouter=Router();
religionRouter.get('/', authCheck(['READ_ACCESS']), async (req, res, next) => {
  try {
    sendStandardResponse<IReligion[]>(res, 'OK', {
      data: await Religion.find(),
      message: 'Successfully fetched list of Religion',
    });
  } catch (error) {
    next(error);
  }
});

religionRouter.post('/', authCheck(['READ_ACCESS']),
  async (req, res, next) => {
    try {
      const religion= new Religion({...req.body});
      sendStandardResponse(res, 'OK', {
        data: await religion.save(),
        message: 'Successfully added new Religion',
      });
    } catch (error) {
      if (error instanceof MongoError && error.code === 11000) {
        // Duplicate entry error
        return sendStandardResponse(res, 'CONFLICT', {
          error: 'Duplicate entry error',
          message: 'Another Religion with the same name already exists!',
        });
      }
      next(error);
    }
  });
religionRouter.patch(
  '/:religionId',
  authCheck(['READ_ACCESS']),
  async (req, res, next) => {
    try {
      const previousReligion = await Religion.findById(
        req.params.religionId,
      );
      const newReligion = await Religion.findByIdAndUpdate(
        req.params.religionId,
        req.body,
        {new: true},
      );
      if (!previousReligion || !newReligion) {
        return next(new Error('Religion ID Not found'));
      }

      sendStandardResponse(res, 'OK', {
        data: newReligion,
        message: 'Successfully updated Religion',
      });
    } catch (error) {
      next(error);
    }
  },
);
religionRouter.delete(
  '/:religionID',
  authCheck(['READ_ACCESS']),
  async (req, res, next) => {
    try {
      const religion = await Religion.findOneAndUpdate(
        {_id: req.params.religionID},
        {new: true},
      );
      if (!religion) {
        return next(new Error('gender ID Not found'));
      }
      sendStandardResponse(res, 'OK', {
        data: religion,
        message: 'Successfully deleted gender',
      });
    } catch (error) {
      next(error);
    }
  },
);

religionRouter.delete(
  '/:religionID/force',
  authCheck(['READ_ACCESS']),
  async (req, res, next) => {
    try {
      const religion = await Religion.findOneAndDelete({
        _id: req.params.religionID,
      });
      if (!religion) {
        return next(new Error('gender ID Not found'));
      }
      sendStandardResponse(res, 'OK', {
        data: religion,
        message: 'Successfully force deleted Religion',
      });
    } catch (error) {
      next(error);
    }
  },
);

export default religionRouter;
