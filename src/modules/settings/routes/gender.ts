import {Router} from 'express';
import authCheck from '../../../extras/auth_check';
import {sendStandardResponse} from '../../../extras/helpers';
import Gender, {IGender} from '../models/gender';
import {MongoError} from 'mongodb';

/**
 * For Adding new Gender
 * [POST] /settings/Gender/
 *
 * @author <@ShibinSk>
 *
 */


const genderRouter=Router();
genderRouter.get('/', authCheck(['READ_ACCESS']), async (req, res, next) => {
  try {
    sendStandardResponse<IGender[]>(res, 'OK', {
      data: await Gender.find({}),
      message: 'Successfully fetched list of Gender',
    });
  } catch (error) {
    next(error);
  }
});

genderRouter.post('/', authCheck(['READ_ACCESS']),
  async (req, res, next) => {
    try {
      const gender= new Gender({...req.body});
      sendStandardResponse(res, 'OK', {
        data: await gender.save(),
        message: 'Successfully added new Gender',
      });
    } catch (error) {
      if (error instanceof MongoError && error.code === 11000) {
        // Duplicate entry error
        return sendStandardResponse(res, 'CONFLICT', {
          error: 'Duplicate entry error',
          message: 'Another gender with the same name already exists!',
        });
      }
      next(error);
    }
  });
genderRouter.patch(
  '/:genderId',
  authCheck(['READ_ACCESS']),
  async (req, res, next) => {
    try {
      const previousGender = await Gender.findById(
        req.params.genderId,
      );
      const newGender = await Gender.findByIdAndUpdate(
        req.params.genderId,
        req.body,
        {new: true},
      );
      if (!previousGender || !newGender) {
        return next(new Error('Language ID Not found'));
      }

      sendStandardResponse(res, 'OK', {
        data: newGender,
        message: 'Successfully updated Gender',
      });
    } catch (error) {
      next(error);
    }
  },
);
genderRouter.delete(
  '/:genderID',
  authCheck(['READ_ACCESS']),
  async (req, res, next) => {
    try {
      const gender = await Gender.findOneAndUpdate(
        {_id: req.params.genderID},
        {new: true},
      );
      if (!gender) {
        return next(new Error('gender ID Not found'));
      }
      sendStandardResponse(res, 'OK', {
        data: gender,
        message: 'Successfully deleted gender',
      });
    } catch (error) {
      next(error);
    }
  },
);

genderRouter.delete(
  '/:genderID/force',
  authCheck(['READ_ACCESS']),
  async (req, res, next) => {
    try {
      const gender = await Gender.findOneAndDelete({
        _id: req.params.genderID,
      });
      if (!gender) {
        return next(new Error('gender ID Not found'));
      }
      sendStandardResponse(res, 'OK', {
        data: gender,
        message: 'Successfully force deleted gender',
      });
    } catch (error) {
      next(error);
    }
  },
);

export default genderRouter;
