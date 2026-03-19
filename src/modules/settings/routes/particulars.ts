import {Router} from 'express';
import {MongoError} from 'mongodb';
import authCheck from '../../../extras/auth_check';
import {sendStandardResponse} from '../../../extras/helpers';
import MainCategory from '../../FR/models/category';


const partocularRouter = Router();

partocularRouter.post(
  '/',
  authCheck(['READ_ACCESS']),
  async (req, res, next) => {
    try {      
      const category = new MainCategory({...req.body});
      //   await category.validate();
      sendStandardResponse(res, 'OK', {
        data: await category.save(),
        message: 'Successfully added new partocular',
      });

    } catch (error) {
      if (error instanceof MongoError && error.code === 11000) {
        // Duplicate entry error
        return sendStandardResponse(res, 'CONFLICT', {
          error: 'Duplicate entry error',
          message: 'Another partocular with the same name already exists!',
        });
      }
      next(error);
    }
  },
);

partocularRouter.patch(
  '/:ID',
  authCheck(['READ_ACCESS']),
  async (req, res, next) => {
    try {
      const prevPariti = await MainCategory.findById(
        req.params.ID,
      );
      const newParti = await MainCategory.findByIdAndUpdate(
        req.params.ID,
        req.body,
        {new: true},
      );
      if (!prevPariti || !newParti) {
        return next(new Error('MainCategory ID Not found'));
      }
      sendStandardResponse(res, 'OK', {
        data: newParti,
        message: 'Successfully MainCategory partocular',
      });
    } catch (error) {
      next(error);
    }
  },
);
partocularRouter.delete(
  '/:id/force',
  authCheck(['READ_ACCESS']),
  async (req, res, next) => {
    try {
      const category = await MainCategory.findOneAndDelete({
        _id: req.params.id,
      });
      if (!category) {
        return next(new Error('category ID Not found'));
      }
      sendStandardResponse(res, 'OK', {
        data: category,
        message: 'Successfully force deleted category',
      });
    } catch (error) {
      next(error);
    }
  },
);

export default partocularRouter;
