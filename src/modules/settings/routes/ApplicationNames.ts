import {Router} from 'express';
import authCheck from '../../../extras/auth_check';
import {sendStandardResponse} from '../../../extras/helpers';
import {MongoError} from 'mongodb';
import ApplicationNames, {IApplicationNames} from '../models/applicationNames';

/**
 * For Adding new Gender
 * [POST] /settings/Gender/
 *
 * @author <@ShibinSk>
 *
 */


const applicationNamesRouter=Router();
applicationNamesRouter.get('/', authCheck(['READ_ACCESS']), async (req, res, next) => {
  try {
    sendStandardResponse<IApplicationNames[]>(res, 'OK', {
      data: await ApplicationNames.find({}),
      message: 'Successfully fetched list of applications names',
    });
  } catch (error) {
    next(error);
  }
});

applicationNamesRouter.post('/', authCheck(['READ_ACCESS']),
  async (req, res, next) => {
    try {
      const gender= new ApplicationNames({...req.body});
      sendStandardResponse(res, 'OK', {
        data: await gender.save(),
        message: 'Successfully added new ApplicationNames',
      });
    } catch (error) {
      if (error instanceof MongoError && error.code === 11000) {
        // Duplicate entry error
        return sendStandardResponse(res, 'CONFLICT', {
          error: 'Duplicate entry error',
          message: 'Another ApplicationNames with the same name already exists!',
        });
      }
      next(error);
    }
  });
applicationNamesRouter.patch(
  '/:genderId',
  authCheck(['READ_ACCESS']),
  async (req, res, next) => {
    try {
      const previousGender = await ApplicationNames.findById(
        req.params.genderId,
      );
      const newGender = await ApplicationNames.findByIdAndUpdate(
        req.params.genderId,
        req.body,
        {new: true},
      );
      if (!previousGender || !newGender) {
        return next(new Error('Language ID Not found'));
      }

      sendStandardResponse(res, 'OK', {
        data: newGender,
        message: 'Successfully updated ApplicationNames',
      });
    } catch (error) {
      next(error);
    }
  },
);
applicationNamesRouter.delete(
  '/:genderID',
  authCheck(['READ_ACCESS']),
  async (req, res, next) => {
    try {
      const gender = await ApplicationNames.findOneAndUpdate(
        {_id: req.params.genderID},
        {new: true},
      );
      if (!gender) {
        return next(new Error('ApplicationNames ID Not found'));
      }
      sendStandardResponse(res, 'OK', {
        data: gender,
        message: 'Successfully deleted ApplicationNames',
      });
    } catch (error) {
      next(error);
    }
  },
);

applicationNamesRouter.delete(
  '/:genderID/force',
  authCheck(['READ_ACCESS']),
  async (req, res, next) => {
    try {
      const gender = await ApplicationNames.findOneAndDelete({
        _id: req.params.genderID,
      });
      if (!gender) {
        return next(new Error('ApplicationNames ID Not found'));
      }
      sendStandardResponse(res, 'OK', {
        data: gender,
        message: 'Successfully force deleted ApplicationNames',
      });
    } catch (error) {
      next(error);
    }
  },
);

export default applicationNamesRouter;
