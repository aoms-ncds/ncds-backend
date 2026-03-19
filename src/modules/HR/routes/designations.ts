import {Router} from 'express';
import {MongoError} from 'mongodb';
import authCheck from '../../../extras/auth_check';
import {sendStandardResponse} from '../../../extras/helpers';
import Designation, {IDesignation} from '../models/Designation';
import designationEvents from '../events/designation_events';
import CommonLifeCycleStates from '../../../extras/CommonLifeCycleStates';

const designationRouter = Router();

/**
 * For getting a list of all designations
 * [GET] /hr/designations/
 * [GET] /hr/designations?status=0 - For getting list of all inactive designations
 * [GET] /hr/designations?status=1 - For getting list of all active designations
 * [GET] /hr/designations?status=-1 - For getting list of all deleted designations
 *
 * @author <sanjaymonsailas@gmail.com>, <@sanjaymonsailas>
 *
 */
designationRouter.get('/', authCheck(['READ_ACCESS']), async (req, res, next) => {
  try {
    const conditions:Partial<IDesignation> = {};
    conditions.status=CommonLifeCycleStates.ACTIVE;
    if (Object.keys(req.query).includes('status')) {
      conditions.status = Number(req.query.status);
    }

    sendStandardResponse<IDesignation[]>(res, 'OK', {
      data: await Designation.find(conditions),
      message: 'Successfully fetched list of Designations',
    });
  } catch (error) {
    next(error);
  }
});

designationRouter.get('/count', authCheck(['ADMIN_ACCESS']), async (req, res, next) => {
  try {
    const conditions: Partial<IDesignation> = {
      status: CommonLifeCycleStates.ACTIVE, // Default to active status
    };

    if (Object.keys(req.query).includes('status')) {
      conditions.status = Number(req.query.status);
    }

    sendStandardResponse<number>(res, 'OK', {
      data: await Designation.countDocuments(conditions),
      message: 'Successfully fetched list of Designation',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * For adding a new designation
 * [POST] /hr/designations/
 *
 * @author <sanjaymonsailas@gmail.com>, <@sanjaymonsailas>
 *
 */
designationRouter.post('/', authCheck(['READ_ACCESS']), async (req, res, next) => {
  try {
    const designation = new Designation({...req.body, status: CommonLifeCycleStates.ACTIVE});
    await designation.validate();
    sendStandardResponse(res, 'OK', {
      data: await designation.save(),
      message: 'Successfully added new designation',
    });
    designationEvents.emit('create', {data: designation});
  } catch (error) {
    if (error instanceof MongoError && error.code === 11000) {
      // Duplicate entry error
      return sendStandardResponse(res, 'CONFLICT', {
        error: 'Duplicate entry error',
        message: 'Another designation with the same name already exists!',
      });
    }
    next(error);
  }
});

/**
 * For getting a specific designation by id
 * [GET] /hr/designations/{designation id}
 *
 * @author <sanjaymonsailas@gmail.com>, <@sanjaymonsailas>
 *
 */
designationRouter.get('/:designationId', authCheck(['READ_ACCESS']), async (req, res, next) => {
  try {
    sendStandardResponse<IDesignation|null>(res, 'OK', {
      data: await Designation.findById(req.params.designationId),
      message: 'Successfully fetched designation',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * For updating a designation
 * [PATCH] /hr/designations/{designation id}
 *
 * @author <sanjaymonsailas@gmail.com>, <@sanjaymonsailas>
 *
 */
designationRouter.patch('/:designationId', authCheck(['READ_ACCESS']), async (req, res, next) => {
  try {
    if (Object.keys(req.body).includes('activate') || Object.keys(req.body).includes('deactivate')) {
      next(new Error('activate and deactivate fields are allowed by this API endpoint!'));
    }
    const previousDesignation = await Designation.findById(req.params.designationId);
    const newDesignation = await Designation.findByIdAndUpdate(req.params.designationId, req.body, {new: true});
    if (!previousDesignation || !newDesignation) {
      return next(new Error('Designation ID Not found'));
    }

    sendStandardResponse(res, 'OK', {
      data: newDesignation,
      message: 'Successfully updated designation',
    });
    designationEvents.emit('update', {data: {previousDesignation, newDesignation}});
  } catch (error) {
    next(error);
  }
});

/**
 * For deleting a designation (Actually it's just updating the status to 'deleted')
 * [DELETED] /hr/designations/{designation id}
 *
 * @author <sanjaymonsailas@gmail.com>, <@sanjaymonsailas>
 *
 */
designationRouter.delete('/:designationId', authCheck(['READ_ACCESS']), async (req, res, next) => {
  try {
    const designation = await Designation.findOneAndUpdate({_id: req.params.designationId}, {status: -1}, {new: true});
    if (!designation) {
      return next(new Error('Designation ID Not found'));
    }
    sendStandardResponse(res, 'OK', {
      data: designation,
      message: 'Successfully deleted designation',
    });
    designationEvents.emit('delete', {data: designation});
  } catch (error) {
    next(error);
  }
});

/**
 * For deleting a designation (Actually it's just updating the status to 'deleted')
 * [DELETED] /hr/designations/{designation id}
 *
 * @author <sanjaymonsailas@gmail.com>, <@sanjaymonsailas>
 *
 */
designationRouter.delete('/:designationId/force', authCheck(['READ_ACCESS']), async (req, res, next) => {
  try {
    const designation = await Designation.findOneAndDelete({_id: req.params.designationId});
    if (!designation) {
      return next(new Error('Designation ID Not found'));
    }
    sendStandardResponse(res, 'OK', {
      data: designation,
      message: 'Successfully force deleted designation',
    });
    // designationEvents.emit('forceDelete', {data: designation});
  } catch (error) {
    next(error);
  }
});

export default designationRouter;
