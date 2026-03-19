import {Router} from 'express';
import {sendStandardResponse} from '../../../extras/helpers';
import authCheck from '../../../extras/auth_check';
import staffEvents from '../events/staff_events';
import mongoose, {FilterQuery} from 'mongoose';
import {MongoError} from 'mongodb';
import {FormattedCode} from '../../../models/FormattedCode';
import Staff, {IStaff} from '../models/Staff';
import StaffLifeCycleStates from '../extras/StaffLifeCycleStates';

const staffsRouter = Router();

/**
 * Route handler for fetching a list of staffs.
 * @name GET /hr/staffs
 * @param {number} req.query.status - The status filter for staffs.
 * @response {IStaff[]} Array of staffs.
 */
staffsRouter.get('/', authCheck(['READ_ACCESS', 'READ_WORKERS', 'WRITE_WORKERS', 'READ_STAFFS', 'WRITE_STAFFS']), async (req, res, next) => {
  try {
    const conditions: FilterQuery<IStaff> = {
      status: StaffLifeCycleStates.ACTIVE,
    };
    if (Object.keys(req.query).includes('status')) {
      conditions.status = Number(req.query.status);
    }

    sendStandardResponse(res, 'OK', {
      data: await Staff.find(conditions),
      message: 'Successfully fetched list of staffs',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Route handler for fetching the count of staffs.
 * @name GET /hr/staffs/count
 * @param {number} req.query.status - The status filter for staffs.
 * @response {number} Count of staffs.
 */
staffsRouter.get('/count', authCheck(['READ_ACCESS']), async (req, res, next) => {
  try {
    const conditions: FilterQuery<IStaff> = {
      status: StaffLifeCycleStates.ACTIVE,
    };
    if (Object.keys(req.query).includes('status')) {
      conditions.status = Number(req.query.status);
    }

    sendStandardResponse(res, 'OK', {
      data: await Staff.countDocuments(conditions),
      message: 'Successfully fetched count of staffs',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Route handler for adding a new staff.
 * @name POST /hr/staffs
 * @param {Object} req.body - Request body containing staff data.
 * @response {IStaff} Added staff.
 */
staffsRouter.post('/', authCheck(['READ_ACCESS', 'READ_WORKERS', 'WRITE_WORKERS', 'READ_STAFFS', 'WRITE_STAFFS']), async (req, res, next) => {
  try {
    const staff = new Staff({
      ...req.body,
      _id: new mongoose.Types.ObjectId(),
      staffCode: 'IETWK' + (await FormattedCode.findOneAndUpdate({}, {$inc: {staffCode: 1}}, {new: true}))?.staffCode.toString().padStart(5, '0'),
      status: StaffLifeCycleStates.ACTIVE,
      spouse: 'Test',
    });
    sendStandardResponse(res, 'OK', {
      data: await staff.save(),
      message: 'Successfully added new staff',
    });
    staffEvents.emit('create', {data: staff});
  } catch (error) {
    console.log(error);
    if (error instanceof MongoError && error.code === 11000) {
      // Duplicate entry error
      return sendStandardResponse(res, 'CONFLICT', {
        error: 'Duplicate entry error',
        message: 'This email address is already in use.',
      });
    }
    next(error);
  }
});

/**
 * Route handler for fetching a staff by ID.
 * @name GET /hr/staffs/:id
 * @param {string} req.params.id - The ID of the staff.
 * @response {IStaff} Retrieved staff.
 */
staffsRouter.get('/:id', authCheck(['READ_ACCESS']), async (req, res, next) => {
  try {
    const staff = await Staff.findById(req.params.id).populate('division');
    if (!staff) {
      return sendStandardResponse(res, 'NOT FOUND', {
        message: 'Staff not found',
      });
    }
    sendStandardResponse(res, 'OK', {
      data: staff,
      message: 'Successfully retrieved staff',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Route handler for updating a staff.
 * @name PUT /hr/staffs/:id
 * @param {string} req.params.id - The ID of the staff.
 * @param {Object} req.body - Request body containing updated staff data.
 * @response {IStaff} Updated staff.
 */
staffsRouter.put('/:id', authCheck(['READ_ACCESS']), async (req, res, next) => {
  try {
    const updatedStaff = await Staff.findByIdAndUpdate(
      req.params.id,
      {$set: req.body},
      {new: true},
    );
    if (!updatedStaff) {
      return sendStandardResponse(res, 'NOT FOUND', {
        message: 'Staff not found',
      });
    }
    sendStandardResponse(res, 'OK', {
      data: updatedStaff,
      message: 'Successfully updated staff',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Route handler for deleting a staff.
 * @name DELETE /hr/staffs/:id
 * @param {string} req.params.id - The ID of the staff.
 * @response {IStaff} Deleted staff.
 */
staffsRouter.delete('/:id', authCheck(['READ_ACCESS']), async (req, res, next) => {
  try {
    const deletedStaff = await Staff.findByIdAndDelete(req.params.id);
    if (!deletedStaff) {
      return sendStandardResponse(res, 'NOT FOUND', {
        message: 'Staff not found',
      });
    }
    sendStandardResponse(res, 'OK', {
      data: deletedStaff,
      message: 'Successfully deleted staff',
    });
  } catch (error) {
    next(error);
  }
});

export default staffsRouter;
