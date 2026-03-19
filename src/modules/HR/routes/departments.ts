import {Router} from 'express';
import authCheck from '../../../extras/auth_check';
import {sendStandardResponse} from '../../../extras/helpers';

import CommonLifeCycleStates from '../../../extras/CommonLifeCycleStates';
import {MongoError} from 'mongodb';
import departmentEvents from '../events/department_events';
import Department, {IDepartment} from '../models/Department';

const departmentRouter = Router();
/**
 * For getting a list of all staffs
 * [GET] /hr/department/
 * [GET] /hr/department?status=0 - For getting list of all inactive staffs
 * [GET] /hr/department?status=1 - For getting list of all active staffs
 * [GET] /hr/department?status=-1 - For getting list of all deleted staffs
 *
 * @author <johnsjkottaram@gmail.com>, <@johns-cv>
 *
 * 📘
 */
departmentRouter.get('/', authCheck([]), async (req, res, next) => {
  try {
    sendStandardResponse<IDepartment[]>(res, 'OK', {
      data: await Department.find(),
      message: 'Successfully fetched list of Department',
    });
  } catch (error) {
    next(error);
  }
});


departmentRouter.post('/', authCheck(['READ_ACCESS']), async (req, res, next) => {
  try {
    const department = new Department({...req.body, status: CommonLifeCycleStates.ACTIVE});
    await department.validate();
    sendStandardResponse(res, 'OK', {
      data: await department.save(),
      message: 'Successfully added new department',
    });
    departmentEvents.emit('create', {data: department});
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

departmentRouter.get('/:departmentId', authCheck(['READ_ACCESS']), async (req, res, next) => {
  try {
    sendStandardResponse<IDepartment|null>(res, 'OK', {
      data: await Department.findById(req.params.departmentId),
      message: 'Successfully fetched department',
    });
  } catch (error) {
    next(error);
  }
});

departmentRouter.patch('/:departmentId', authCheck(['READ_ACCESS']), async (req, res, next) => {
  try {
    if (Object.keys(req.body).includes('activate') || Object.keys(req.body).includes('deactivate')) {
      next(new Error('activate and deactivate fields are allowed by this API endpoint!'));
    }
    const previousDepartment = await Department.findById(req.params.departmentId);
    const newDepartment = await Department.findByIdAndUpdate(req.params.departmentId, req.body, {new: true});
    if (!previousDepartment || !newDepartment) {
      return next(new Error('Deparment ID Not found'));
    }

    sendStandardResponse(res, 'OK', {
      data: newDepartment,
      message: 'Successfully updated department',

    });
    departmentEvents.emit('update', {data: {previousDepartment, newDepartment}});
  } catch (error) {
    next(error);
  }
});

departmentRouter.delete('/:departmentId', authCheck(['READ_ACCESS']), async (req, res, next) => {
  try {
    const department = await Department.findOneAndUpdate({_id: req.params.departmentId}, {status: -1}, {new: true});
    if (!department) {
      return next(new Error('department ID Not found'));
    }
    sendStandardResponse(res, 'OK', {
      data: department,
      message: 'Successfully deleted department',
    });
    departmentEvents.emit('delete', {data: department});
  } catch (error) {
    next(error);
  }
});

departmentRouter.delete('/:departmentId/force', authCheck(['READ_ACCESS']), async (req, res, next) => {
  try {
    const department = await Department.findOneAndDelete({_id: req.params.departmentId});
    if (!department) {
      return next(new Error('department ID Not found'));
    }
    sendStandardResponse(res, 'OK', {
      data: department,
      message: 'Successfully force deleted department',
    });
    // departmentEvents.emit('delete', {data: department as IDepartment});
  } catch (error) {
    next(error);
  }
});

export default departmentRouter;


