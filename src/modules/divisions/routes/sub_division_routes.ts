import {Router} from 'express';
import authCheck from '../../../extras/auth_check';
import {sendStandardResponse} from '../../../extras/helpers';
import subDivisionEvents from '../events/sub_division_events';
import mongoose, {FilterQuery} from 'mongoose';
import Division from '../models/Division';
import DivisionLifeCycleStates from '../extras/DivisionLifeCycle';
import SubDivision, {ISubDivision} from '../models/SubDivision';
import DivisionUpdateLog from '../models/DivisionUpdateLog';
import division from '..';

const subDivisionRouter = Router();

/**
 * For getting a list of all sub divisions
 * [GET] /division/sub_division/
 * [GET] /division/sub_division?status=0 - For getting list of all inactive sub divisions
 * [GET] /division/sub_division?status=1 - For getting list of all active sub divisions
 * [GET] /division/sub_division?status=-1 - For getting list of all deleted sub divisions
 *
 * @author <sanjaymonsailas@gmail.com>, <@sanjaymonsailas>
 *
 */
subDivisionRouter.get('/', authCheck(['READ_DIVISIONS']), async (req, res, next) => {
  try {
    const conditions: FilterQuery<ISubDivision> = {
      status: DivisionLifeCycleStates.ACTIVE, // Default to active status
    };

    if (Object.keys(req.query).includes('status')) {
      conditions.status = Number(req.query.status);
    }

    if (res.locals.authUser.kind == 'worker') {
      conditions.division = res.locals.authUser.division;
    }

    console.log({conditions});

    sendStandardResponse<ISubDivision[]>(res, 'OK', {
      data: await SubDivision.find(conditions),
      message: 'Successfully fetched list of Sub Divisions',
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
});

subDivisionRouter.get('/count', authCheck(['READ_ACCESS']), async (req, res, next) => {
  try {
    const conditions: FilterQuery<ISubDivision> = {
      status: DivisionLifeCycleStates.ACTIVE, // Default to active status
    };

    if (Object.keys(req.query).includes('status')) {
      conditions.status = Number(req.query.status);
    }

    if (res.locals.authUser.kind == 'worker') {
      conditions.division = res.locals.authUser.division;
    }

    sendStandardResponse<number>(res, 'OK', {
      data: await SubDivision.countDocuments(conditions),
      message: 'Successfully fetched list of Divisions',
    });
  } catch (error) {
    next(error);
  }
});
subDivisionRouter.get('/countIts', authCheck(['READ_ACCESS']), async (req, res, next) => {
  try {
    const conditions: FilterQuery<ISubDivision> = {
      status: DivisionLifeCycleStates.ACTIVE, // Default to active status
    };

    if (Object.keys(req.query).includes('status')) {
      conditions.status = Number(req.query.status);
    }

    if (res.locals.authUser.kind == 'worker') {
      conditions.division = res.locals.authUser.division;
    }
    conditions.isIT =true;
    const count = await SubDivision.aggregate([
      {
        $lookup: {
          from: 'divisions', // Name of the Division collection
          localField: 'division', // Field in SubDivision referencing Division
          foreignField: '_id', // Field in Division matching SubDivision
          as: 'divisionData',
        },
      },
      {
        $match: {
          'divisionData.details.isIT': true, // Filter where isIT = true in Division details
        },
      },
      {
        $count: 'total', // Count matching documents
      },
    ]);

    const total = count.length > 0 ? count[0].total : 0;
    console.log(total, 'total');

    sendStandardResponse<number>(res, 'OK', {
      data: total,
      message: 'Successfully fetched list of Divisions',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * For adding a new sub division
 * [POST] /division/sub_division/
 *
 * @author <sanjaymonsailas@gmail.com>, <@sanjaymonsailas>
 *
 */
subDivisionRouter.post('/', authCheck(['WRITE_DIVISIONS']), async (req, res, next) => {
  try {
    console.log(req.body, '878');
    const subDivId = new mongoose.Types.ObjectId();
    const createdSubDivision = await SubDivision.create({
      ...req.body,
      _id: subDivId,
      status: DivisionLifeCycleStates.ACTIVE,
    });
    console.log(createdSubDivision, 'createdSubDivision');

    await Division.updateOne({_id: req.body.division}, {
      $push: {subDivisions: subDivId},
    });
    const div= await Division.findById(req.body.division);
    await new DivisionUpdateLog({
      divName: div?.details.name,
      divId: req.body?.division,
      field: `SubDivision ${req.body.name} Added`,
      doneBy: res.locals.authUser._id,
    }).save();
    sendStandardResponse(res, 'OK', {
      data: createdSubDivision,
      message: 'Successfully added new subDivisions',
    });
  } catch (error) {
    next(error);
  }
});


/**
 * For getting a specific sub division by Division id
 * [GET] /division/sub_division/{division id}
 *
 * @author <sanjaymonsailas@gmail.com>, <@sanjaymonsailas>
 *
 */
subDivisionRouter.get('/:divisionId', authCheck(['READ_DIVISIONS']), async (req, res, next) => {
  try {
    const id = req.params.divisionId;
    console.log(id, 'IDDD');

    // Use `findOne` to search for the document based on the `division` field
    const subDivision = await SubDivision.find({division: id});

    if (!subDivision) {
      return sendStandardResponse(res, 'OK', {
        message: 'Sub division not found',
      });
    }

    // If the sub-division is found, send a successful response with the data
    return sendStandardResponse(res, 'OK', {
      data: subDivision,
      message: 'Successfully fetched Sub divisions',
    });
  } catch (error) {
    console.error('Error fetching sub division:', error);
    next(error);
  }
});

/**
 * For updating a sub division
 * [PATCH] /division/sub_division/{sub_division id}
 *
 * @author <sanjaymonsailas@gmail.com>, <@sanjaymonsailas>
 *
 */
subDivisionRouter.patch('/:subDivisionId', authCheck(['WRITE_DIVISIONS']), async (req, res, next) => {
  try {
    if (Object.keys(req.body).includes('activate') || Object.keys(req.body).includes('deactivate')) {
      next(new Error('activate and deactivate fields are allowed by this API endpoint!'));
    }
    console.log(req.body, 'req.body99');
    const divarray= [];
    divarray.push(req.body);
    console.log(divarray.length, 'llllo');
    const previousSubDivision = await SubDivision.findById(req.params.subDivisionId);
    const subDivision = await SubDivision.findById(req.params.subDivisionId).populate('division');
    console.log(subDivision?.name, 'previousSubDivision?.name');
    console.log(req.body.name, 'previousSubDivision?.name');
    const newSubDivision = await SubDivision.findByIdAndUpdate(req.params.subDivisionId, req.body, {new: true}).populate('division');
    if (!previousSubDivision || !newSubDivision) {
      return next(new Error('Sub division ID Not found'));
    }
    await Division.updateOne({_id: req.body.division}, {
      $push: {subDivisions: req.params.subDivisionId},
    });
    sendStandardResponse(res, 'OK', {
      data: newSubDivision,
      message: 'Successfully updated sub division',
    });

    subDivisionEvents.emit('update', {data: {previousSubDivision, newSubDivision}});
  } catch (error) {
    next(error);
  }
});

/**
 * For deleting a sub division (Actually it's just updating the status to 'deleted')
 * [DELETED] /division/sub_division/{sub_division id}
 *
 * @author <sanjaymonsailas@gmail.com>, <@sanjaymonsailas>
 *
 */
subDivisionRouter.delete('/:subDivisionId', authCheck(['WRITE_DIVISIONS']), async (req, res, next) => {
  try {
    const subDivision = await SubDivision.findOneAndUpdate({_id: req.params.subDivisionId}, {status: -1}, {new: true}).populate('division');
    const div =await Division.updateOne({_id: subDivision?.division._id}, {
      $pull: {subDivisions: req.params.subDivisionId},
    });
    console.log(subDivision, 'div88');
    if (!subDivision) {
      return next(new Error('Sub division ID Not found'));
    }
    new DivisionUpdateLog({
      divName: subDivision.division.details.name,
      divId: subDivision.division._id,
      field: `subDivision ${subDivision.name} deleted,`,
      doneBy: res.locals.authUser._id,
    }).save();
    sendStandardResponse(res, 'OK', {
      data: subDivision,
      message: 'Successfully deleted sub division',
    });
    subDivisionEvents.emit('delete', {data: subDivision});
  } catch (error) {
    next(error);
  }
});

/**
 * For deleting a sub division (Actually it's just updating the status to 'deleted')
 * [DELETED] /division/sub_division/{sub_division id}
 *
 * @author <sanjaymonsailas@gmail.com>, <@sanjaymonsailas>
 *
 */
subDivisionRouter.delete('/:subDivisionId/force', authCheck(['WRITE_DIVISIONS']), async (req, res, next) => {
  try {
    const subDivision = await SubDivision.findOneAndDelete({_id: req.params.subDivisionId});
    if (!subDivision) {
      return next(new Error('Sub division ID Not found'));
    }
    sendStandardResponse(res, 'OK', {
      data: subDivision,
      message: 'Successfully force deleted sub division',
    });
    // subDivisionEvents.emit('forceDelete', {data: subDivision});
  } catch (error) {
    next(error);
  }
});

export default subDivisionRouter;
