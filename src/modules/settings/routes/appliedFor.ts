import {Router} from 'express';
import authCheck from '../../../extras/auth_check';
import {sendStandardResponse} from '../../../extras/helpers';
import {MongoError} from 'mongodb';
import ApplicationNames, {IApplicationNames} from '../models/applicationNames';
import AppliedFor from '../models/appliedFor';

/**
 * For Adding new Gender
 * [POST] /settings/Gender/
 *
 * @author <@ShibinSk>
 *
 */


const appliedForRouter=Router();
appliedForRouter.get('/', authCheck(['READ_ACCESS']), async (req, res, next) => {
  try {
    sendStandardResponse<IApplicationNames[]>(res, 'OK', {
      data: await AppliedFor.find({}),
      message: 'Successfully fetched list of AppliedFor',
    });
  } catch (error) {
    next(error);
  }
});

appliedForRouter.post('/', authCheck(['READ_ACCESS']),
  async (req, res, next) => {
    try {
      const gender= new AppliedFor({...req.body});
      sendStandardResponse(res, 'OK', {
        data: await gender.save(),
        message: 'Successfully added new AppliedFor',
      });
    } catch (error) {
      if (error instanceof MongoError && error.code === 11000) {
        // Duplicate entry error
        return sendStandardResponse(res, 'CONFLICT', {
          error: 'Duplicate entry error',
          message: 'Another AppliedFor with the same name already exists!',
        });
      }
      next(error);
    }
  });
appliedForRouter.patch(
  '/:genderId',
  authCheck(['READ_ACCESS']),
  async (req, res, next) => {
    try {
      const previousGender = await AppliedFor.findById(
        req.params.genderId,
      );
      const newGender = await AppliedFor.findByIdAndUpdate(
        req.params.genderId,
        req.body,
        {new: true},
      );
      if (!previousGender || !newGender) {
        return next(new Error('Language ID Not found'));
      }

      sendStandardResponse(res, 'OK', {
        data: newGender,
        message: 'Successfully updated AppliedFor',
      });
    } catch (error) {
      next(error);
    }
  },
);
appliedForRouter.delete(
  '/:genderID',
  authCheck(['READ_ACCESS']),
  async (req, res, next) => {
    try {
      const gender = await AppliedFor.findOneAndUpdate(
        {_id: req.params.genderID},
        {new: true},
      );
      if (!gender) {
        return next(new Error('AppliedFor ID Not found'));
      }
      sendStandardResponse(res, 'OK', {
        data: gender,
        message: 'Successfully deleted AppliedFor',
      });
    } catch (error) {
      next(error);
    }
  },
);

appliedForRouter.delete(
  '/:genderID/force',
  authCheck(['READ_ACCESS']),
  async (req, res, next) => {
    try {
      const gender = await AppliedFor.findOneAndDelete({
        _id: req.params.genderID,
      });
      if (!gender) {
        return next(new Error('AppliedFor ID Not found'));
      }
      sendStandardResponse(res, 'OK', {
        data: gender,
        message: 'Successfully force deleted AppliedFor',
      });
    } catch (error) {
      next(error);
    }
  },
);

export default appliedForRouter;
