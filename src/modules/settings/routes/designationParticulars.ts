import {Router} from 'express';
import {MongoError} from 'mongodb';
import authCheck from '../../../extras/auth_check';
import {sendStandardResponse} from '../../../extras/helpers';
import DesignationParticulars, {IDesignationParticulars} from '../models/designationParticulars';

const designationParticularsRouter = Router();

designationParticularsRouter.get('/', authCheck(['READ_ACCESS']), async (req, res, next) => {
  try {
    sendStandardResponse<IDesignationParticulars[]|null>(res, 'OK', {
      data: await DesignationParticulars.find({}),
      message: 'Successfully fetched list of DesignationParticulars',
    });
  } catch (error) {
    next(error);
  }
});

designationParticularsRouter.get('/count', authCheck(['READ_ACCESS']), async (req, res, next) => {
  try {
    sendStandardResponse<number>(res, 'OK', {
      data: await DesignationParticulars.countDocuments(),
      message: 'Successfully fetched list of DesignationParticulars',
    });
  } catch (error) {
    next(error);
  }
});

designationParticularsRouter.post(
  '/',
  authCheck(['READ_ACCESS']),
  async (req, res, next) => {
    try {
      const designationParticulars = new DesignationParticulars({...req.body});
      //   await designationParticulars.validate();
      sendStandardResponse(res, 'OK', {
        data: await designationParticulars.save(),
        message: 'Successfully added new designationParticulars',
      });
    } catch (error) {
      if (error instanceof MongoError && error.code === 11000) {
        // Duplicate entry error
        return sendStandardResponse(res, 'CONFLICT', {
          error: 'Duplicate entry error',
          message: 'Another designationParticulars with the same name already exists!',
        });
      }
      next(error);
    }
  },
);

designationParticularsRouter.get(
  '/:designationParticularsId',
  authCheck(['READ_ACCESS']),
  async (req, res, next) => {
    try {
      sendStandardResponse<IDesignationParticulars | null>(res, 'OK', {
        data: await DesignationParticulars.findById(req.params.designationParticularsId),
        message: 'Successfully fetched designationParticulars',
      });
    } catch (error) {
      next(error);
    }
  },
);

designationParticularsRouter.patch(
  '/:designationParticularsId',
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
      const previousDesignationParticulars = await DesignationParticulars.findById(
        req.params.designationParticularsId,
      );
      const newDesignationParticulars = await DesignationParticulars.findByIdAndUpdate(
        req.params.designationParticularsId,
        req.body,
        {new: true},
      );
      if (!previousDesignationParticulars || !newDesignationParticulars) {
        return next(new Error('DesignationParticulars ID Not found'));
      }

      sendStandardResponse(res, 'OK', {
        data: newDesignationParticulars,
        message: 'Successfully updated DesignationParticulars',
      });
    } catch (error) {
      next(error);
    }
  },
);

designationParticularsRouter.delete(
  '/:designationParticularsId',
  authCheck(['READ_ACCESS']),
  async (req, res, next) => {
    try {
      const designationParticulars = await DesignationParticulars.findOneAndUpdate(
        {_id: req.params.designationParticularsId},
        {new: true},
      );
      if (!designationParticulars) {
        return next(new Error('designationParticulars ID Not found'));
      }
      sendStandardResponse(res, 'OK', {
        data: designationParticulars,
        message: 'Successfully deleted designationParticulars',
      });
    } catch (error) {
      next(error);
    }
  },
);

designationParticularsRouter.delete(
  '/:designationParticularsId/force',
  authCheck(['READ_ACCESS']),
  async (req, res, next) => {
    try {
      const designationParticulars = await DesignationParticulars.findOneAndDelete({
        _id: req.params.designationParticularsId,
      });
      if (!designationParticulars) {
        return next(new Error('designationParticulars ID Not found'));
      }
      sendStandardResponse(res, 'OK', {
        data: designationParticulars,
        message: 'Successfully force deleted designationParticulars',
      });
    } catch (error) {
      next(error);
    }
  },
);

export default designationParticularsRouter;
