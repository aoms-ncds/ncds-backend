import {Router} from 'express';
import CustomUser, {ICustomUser} from '../models/customUsers';
import {sendStandardResponse} from '../../../extras/helpers';
import authCheck from '../../../extras/auth_check';
import {MongoError} from 'mongodb';


const customUsersRouter=Router();

customUsersRouter.get('/', async (req, res, next) => {
  try {
    sendStandardResponse<ICustomUser[]>(res, 'OK', {
      data: await CustomUser.find({}).populate('division').populate('eSign'),
      message: 'Successfully fetched list of names',
    });
  } catch (error) {
    next(error);
  }
});

customUsersRouter.post('/', authCheck(['READ_ACCESS']),
  async (req, res, next) => {
    try {
      const Users= new CustomUser({...req.body});
      sendStandardResponse(res, 'OK', {
        data: await Users.save(),
        message: 'Successfully added new CustomUser',
      });
    } catch (error) {
      if (error instanceof MongoError && error.code === 11000) {
        // Duplicate entry error
        return sendStandardResponse(res, 'CONFLICT', {
          error: 'Duplicate entry error',
          message: 'Another CustomUser with the same name already exists!',
        });
      }
      next(error);
    }
  });
customUsersRouter.delete(
  '/:genderID',
  authCheck(['READ_ACCESS']),
  async (req, res, next) => {
    try {
      const gender = await CustomUser.findOneAndUpdate(
        {_id: req.params.genderID},
        {new: true},
      );
      if (!gender) {
        return next(new Error('CustomUser ID Not found'));
      }
      sendStandardResponse(res, 'OK', {
        data: gender,
        message: 'Successfully deleted CustomUser',
      });
    } catch (error) {
      next(error);
    }
  },
);
customUsersRouter.delete(
  '/:genderID/force',
  authCheck(['READ_ACCESS']),
  async (req, res, next) => {
    try {
      const gender = await CustomUser.findOneAndDelete({
        _id: req.params.genderID,
      });
      if (!gender) {
        return next(new Error('CustomUser ID Not found'));
      }
      sendStandardResponse(res, 'OK', {
        data: gender,
        message: 'Successfully force deleted CustomUser',
      });
    } catch (error) {
      next(error);
    }
  },
);
export default customUsersRouter;
