/* eslint-disable max-len */
import {Router} from 'express';
import authCheck from '../../../extras/auth_check';
import {sendStandardResponse} from '../../../extras/helpers';
import divisionEvents from '../events/division_events';
import Division, {IDivision} from '../models/Division';
import subDivisionRouter from './sub_division_routes';
import DivisionLifeCycleStates from '../extras/DivisionLifeCycle';
import mongoose, {FilterQuery} from 'mongoose';
import {FormattedCode} from '../../../models/FormattedCode';
import SubDivision from '../models/SubDivision';
import subDivisionEvents from '../events/sub_division_events';
import CommonLifeCycleStates from '../../../extras/CommonLifeCycleStates';
import User from '../../users/models/User';
import UserPermissions from '../../users/models/UserPermissions';
import Worker, {IWorker} from '../../workers/models/Worker';
import {compareAndLog} from '../../users/extras/updateLog';
import DivisionUpdateLog, {IDivisionUpdateLog} from '../models/DivisionUpdateLog';
import {ObjectId} from 'mongodb';
import UserLifeCycleStates from '../../users/extras/UserLifeCycleStates';
import FR from '../../FR/models/FR';
import Transactions from '../../transactions/models/transactions';

const divisionRouter = Router();

divisionRouter.use('/sub_divisions', subDivisionRouter);

/**
 * For getting a list of all divisions
 * [GET] /divisions/
 * [GET] /divisions?status=0 - For getting list of all inactive divisions
 * [GET] /divisions?status=100 - For getting list of all active divisions
 * [GET] /divisions?status=-1 - For getting list of all deleted divisions
 *
 * @author <sanjaymonsailas@gmail.com>, <@sanjaymonsailas>
 *
 * 📘
 */
divisionRouter.get('/', authCheck(['READ_ALL_DIVISIONS']), async (req, res, next) => {
  try {
    const conditions: FilterQuery<IDivision> = {
      status: {
        $eq: DivisionLifeCycleStates.ACTIVE,
        $ne: DivisionLifeCycleStates.DELETED,
      }, // Default to active status
    };

    if (Object.keys(req.query).includes('status')) {
      conditions.status = Number(req.query.status);
    }

    sendStandardResponse<IDivision[]>(res, 'OK', {
      data: await Division.find(conditions)
        .populate('details.coordinator.name')
        .populate('details.juniorLeader.name')
        .populate('details.seniorLeader.name')
        .populate('details.president.name')
        .populate('details.officeManager.name')
        .populate('details.additionalJuniorLeader.name'),
    });
  } catch (error) {
    next(error);
  }
});
divisionRouter.get('/recent-activity', async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
console.log(today, 'today');

    // Today FR count
    const todayCount = await FR.countDocuments({
      createdAt: {$gte: today},
    });
    console.log(todayCount, 'todayCount');


    // Latest FR created
    const latestFR = await FR.findOne()
      .sort({createdAt: -1})
      .select('createdAt');

    const result = {
      title: 'New FRs Submitted',
      count: todayCount,
      time: latestFR?.createdAt,
    };

    sendStandardResponse(res, 'OK', {
      data: result,
    });
  } catch (error) {
    next(error);
  }
});
divisionRouter.get('/isCoordinator', authCheck([]), async (req, res, next) => {
  try {
    const divisions = await Division.find({});
    // console.log(divisions, 'Divisions Array');
    console.log(res.locals.authUser._id, typeof res.locals.authUser._id, 'Auth User ID');

    // Check if the user is a coordinator for any division
    const isCoordinator = divisions.some(
      (division) =>
        division.details?.coordinator?.name?.toString() === res.locals.authUser._id.toString(),
    );

    console.log(isCoordinator, 'isCoordinator43');


    sendStandardResponse<boolean>(res, 'OK', {
      data: isCoordinator,
    });
  } catch (error) {
    next(error);
  }
});

divisionRouter.get('/coordinators', authCheck(['READ_ALL_DIVISIONS']), async (req, res, next) => {
  try {
    const divisions = await Division.find({});
    const coordinatorNames = divisions.map((d) => d.details.coordinator?.name);

    console.log(coordinatorNames, 'coordinatorNames');

    const workers = await Worker.find({'_id': {$in: coordinatorNames}}).populate('division').populate('spouse').populate({
      path: 'officialDetails',
      populate: {
        path: 'divisionHistory',
        populate: {
          path: 'subDivision',
          model: 'sub_divisions',
        },
      },
    }).populate({
      path: 'supportDetails',
      populate: {
        path: 'designation',
        model: 'designations',
      },
    })
      .populate('basicDetails.knownLanguages');

    console.log(workers.map((id)=>id._id), 'workers');


    sendStandardResponse<IWorker[]>(res, 'OK', {
      data: workers,
    });
  } catch (error) {
    next(error);
  }
});

divisionRouter.get(
  '/with-worker-count',
  authCheck(['READ_ALL_DIVISIONS']),
  async (req, res, next) => {
    try {
      const divisions = await Division.aggregate([
        {
          $lookup: {
            from: 'users',
            let: {divisionId: '$_id'},
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      {$eq: ['$division', '$$divisionId']},
                      {$eq: ['$status', UserLifeCycleStates.ACTIVE]},
                      {$eq: ['$kind', 'worker']},
                    ],
                  },
                },
              },
              {
                $project: {
                  spouseCount: {
                    $cond: [
                      {$ifNull: ['$spouse', false]},
                      1,
                      0,
                    ],
                  },
                },
              },
              {
                $group: {
                  _id: null,
                  totalUsers: {$sum: 1},
                  totalSpouses: {$sum: '$spouseCount'},
                },
              },
              {
                $project: {
                  _id: 0,
                  totalWorkers: {
                    $add: ['$totalUsers', '$totalSpouses'],
                  },
                },
              },
            ],
            as: 'workerStats',
          },
        },
        {
          $addFields: {
            totalWorkers: {
              $ifNull: [
                {$arrayElemAt: ['$workerStats.totalWorkers', 0]},
                0,
              ],
            },
          },
        },
        {
          $project: {
            workerStats: 0,
          },
        },
      ]);

      sendStandardResponse(res, 'OK', {
        data: divisions,
      });
    } catch (error) {
      next(error);
    }
  },
);
/**
 * For adding a new division
 * [POST] /division/divisions/
 *
 * @author <sanjaymonsailas@gmail.com>, <@sanjaymonsailas>
 *
 * 📝
 */


divisionRouter.post('/', authCheck(['WRITE_DIVISIONS']), async (req, res, next) => {
  try {
    console.log(req.body, 'shibin');
    const division = new Division({
      ...req.body,
      _id: new mongoose.Types.ObjectId(),
      details: {
        ...req.body.details,
        divisionId: 'DIV'+(await FormattedCode.findOneAndUpdate({}, {$inc: {divCode: 1}}, {new: true}))?.divCode.toString().padStart(5, '0'),
      },
      subDivisions: [],
      status: DivisionLifeCycleStates.ACTIVE,
    });
    await division.validate();

    sendStandardResponse(res, 'OK', {
      data: await division.save(),
      message: 'Successfully created division '+division,
    });
    divisionEvents.emit('create', {data: division});
  } catch (error) {
    next(error);
  }
});


/**
 * For getting a count of all divisions
 * [GET] /divisions/count
 * [GET] /divisions/count?status=0 - For getting list of all inactive divisions
 * [GET] /divisions/count?status=1 - For getting list of all active divisions
 * [GET] /divisions/count?status=-1 - For getting list of all deleted divisions
 *
 * @author <annmariya@computervalley.online>, <@annmariyacomputervalley>
 *
 * 📘
 */
divisionRouter.get('/count', authCheck(['READ_ACCESS']), async (req, res, next) => {
  try {
    const conditions: FilterQuery<IDivision> = {
      status: DivisionLifeCycleStates.ACTIVE, // Default to active status
    };

    if (Object.keys(req.query).includes('status')) {
      conditions.status = Number(req.query.status);
    }
    if (res.locals.authUser.kind == 'worker') {
      conditions.division = res.locals.authUser.division;
    }
    sendStandardResponse<number>(res, 'OK', {
      data: await Division.countDocuments(conditions),
      message: 'Successfully fetched list of Divisions',
    });
  } catch (error) {
    next(error);
  }
});
divisionRouter.get('/countIts', authCheck(['READ_ACCESS']), async (req, res, next) => {
  try {
    const conditions: FilterQuery<IDivision> = {
      status: DivisionLifeCycleStates.ACTIVE, // Default to active status
    };

    if (Object.keys(req.query).includes('status')) {
      conditions.status = Number(req.query.status);
    }
    if (res.locals.authUser.kind == 'worker') {
      conditions.division = res.locals.authUser.division;
    }

    console.log(conditions, 'conditions');

    sendStandardResponse<any>(res, 'OK', {
      data: await Division.find({
        ...conditions,
        'details.isIT': true,
      }),
      message: 'Successfully fetched list of Divisions',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * For getting a specific division by id
 * [GET] /division/divisions/{division id}
 *
 * @author <sanjaymonsailas@gmail.com>, <@sanjaymonsailas>
 *
 * 📄
 */
divisionRouter.get('/:divisionId', authCheck(['READ_DIVISIONS']), async (req, res, next) => {
  // console.log('Starting to debug!');
  try {
    sendStandardResponse<IDivision|null>(res, 'OK', {
      data: await Division.findById(req.params.divisionId)
        .populate('details.coordinator.name')
        .populate('details.additionalJuniorLeader.name')
        .populate('details.additionalSeniorLeader.name')
        .populate('details.coordinator.sign')
        .populate('details.prevCoordinator.name')
        .populate('details.prevCoordinator.sign')
        .populate('details.juniorLeader.name')
        .populate('details.juniorLeader.sign')
        .populate('details.prevJuniorLeader1.name')
        .populate('details.prevJuniorLeader1.sign')
        .populate('details.seniorLeader.name')
        .populate('details.seniorLeader.sign')
        .populate('details.prevJuniorLeader2.name')
        .populate('details.prevJuniorLeader2.sign')
        .populate('details.coordinator.sign')
        .populate('details.president.name')
        .populate('details.president.sign')
        .populate('details.officeManager.name')
        .populate('details.officeManager.sign')
        .populate('details.additionalJuniorLeader.sign')
        .populate('details.additionalSeniorLeader.sign')
        .populate({
          path: 'subDivisions',
          populate: {
            path: 'leader',
            model: 'users',
          },
        }),
      message: 'Successfully fetched division',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * For Get  a division log by Id
 * [GET] /divisions/{divisionId}/log
 *
 * ✍🏻
 */
divisionRouter.get( '/:divisionId/log',
  authCheck(['MANAGE_WORKER']),
  async (req, res, next) => {
    try {
      sendStandardResponse<IDivisionUpdateLog[]| null>(res, 'OK', {
        data: await DivisionUpdateLog.find({divId: req.params.divisionId}).populate('doneBy').sort({createdAt: 1}),
        message: 'Successfully fetched Division log',
      });
    } catch (error) {
      next(error);
    }
  });
/**
 * For updating a division
 * [PATCH] /division/divisions/{division id}
 *
 * @author <sanjaymonsailas@gmail.com>, <@sanjaymonsailas>
 *
 * ✍🏻
 */

/**
 * If Co-ordinator is added to Division the
 * permission of that user Changes to certain permission
 * and permission resets to old Co-ordinator if there is new co-ordinator
 *
 * [POST] /division/divisions/{ division Id}
 *
 * @author <seshumadhavan2000@gmail.com>, <@5eshumadhavan>
 *
 *  ✍🏻
 */
divisionRouter.patch('/:divisionId', authCheck(['WRITE_DIVISIONS']), async (req, res, next) => {
  try {
    const Permissions = {
      READ_ACCESS: true,
      READ_WORKERS: true,
      WRITE_WORKERS: true,
      READ_FR: true,
      RAISE_WORKERS_FR: true,
      READ_DIVISIONS: true,
      WRITE_FR: true,
      READ_IRO: true,
      WRITE_IRO: true,
      READ_APPLICATION: true,
      WRITE_APPLICATION: true,
    };

    const DefaultPermissions = {
      READ_ACCESS: false,
      READ_WORKERS: false,
      WRITE_WORKERS: false,
      RAISE_WORKERS_FR: false,
      READ_FR: false,
      READ_DIVISIONS: false,
      READ_ALL_DIVISIONS: false,
      WRITE_FR: false,
      READ_IRO: false,
      WRITE_IRO: false,
      READ_APPLICATION: false,
      WRITE_APPLICATION: false,
    };

    console.log(req.body, '08');

    const userReset = async (user: 'coordinator' ) =>{
      const previousDiv = await Division.findById(req.params.divisionId);
      if (previousDiv) {
        const personID = (previousDiv.details[user]?.name)?.toString();
        console.log(personID);
        if (req.body.details[user]?.name?._id === personID?.toString()) {
          console.log('found to be same,so no change');
        } else {
          console.log('not found to be same,previous user - id:', personID);
          const userPermission = await User.findById(personID);
          if (userPermission) {
            const resetPermission = await UserPermissions.findByIdAndUpdate(
              userPermission.permissions,
              DefaultPermissions);
            if (resetPermission) {
              console.log('old user user - id:', personID, ' reseted permission to default');
            } else {
              console.log('not reseted');
            }
          } else {
            console.log('not found userPermission');
          }
        }
      } else {
        console.log('nope');
      }
    };
    userReset('coordinator');

    if (req.body.details?.coordinator?.name?.permissions) {
      const coordinatorPermissionId = req.body.details.coordinator.name.permissions;
      console.log(coordinatorPermissionId, 'coordinatorPermissionId');

      if (coordinatorPermissionId) {
        const userPermission = await UserPermissions.findByIdAndUpdate(
          coordinatorPermissionId,
          Permissions);
        if (userPermission) {
          console.log({coordinatorPermissionId});
        }
      }
    } else {
      console.log('no coordinator');
    }

    if (Object.keys(req.body).includes('activate') || Object.keys(req.body).includes('deactivate')) {
      next(new Error('activate and deactivate fields are allowed by this API endpoint!'));
    }
    const previousDivision = await Division.findById(req.params.divisionId).populate({path: 'details.coordinator.name', populate: 'division'});
    const newDivision = await Division.findByIdAndUpdate(req.params.divisionId, {...req.body,
      FCRABankDetails: req.body.DivisionBankFCRA,
      localBankDetails: req.body?.DivisionBankLocal,
      otherBankDetails: req.body?.BeneficiaryBank1,
      // details: {
      //   ...req.body.details,
      //   additionalSeniorLeader: {
      //     name: req.body?.details?.additionalSeniorLeader?.name?._id,
      //   },
      //   additionalJuniorLeader: {
      //     name: req.body?.details?.additionalJuniorLeader?.name?._id,
      //   },
      // },
    },
    {new: true}).populate({path: 'details.coordinator.name', populate: 'division'});
    // const newDivision = await Division.findByIdAndUpdate(req.params.divisionId, req.body, {new: true}).populate({path: 'details.coordinator.name', populate: 'division'});
    if (!previousDivision || !newDivision) {
      return next(new Error('Division ID Not found'));
    } else {
      console.log(newDivision?.details?.name, 'newDivision?.details?.name');
      const previousDivisionObj:IWorker = previousDivision instanceof mongoose.Document ? previousDivision.toObject() : previousDivision;
      console.log(previousDivisionObj, 'previousDivisionObj');
      const newDivisionObj = newDivision instanceof mongoose.Document ? newDivision.toObject() : newDivision;
      console.log(newDivisionObj, 'newDivisionObj');
      compareAndLog(
        previousDivisionObj,
        newDivisionObj,
        '',
        req.params.divisionId,
        res.locals.authUser._id,
        newDivision?.details?.name ?? 'Unknown Division', // Use a fallback
        'division',
      );
    }
    const bankFields = [
      'DivisionBankFCRA', 'DivisionBankLocal',
      'BeneficiaryBank1', 'BeneficiaryBank2', 'BeneficiaryBank3',
      'BeneficiaryBank4', 'BeneficiaryBank5', 'BeneficiaryBank6',
      'BeneficiaryBank7', 'BeneficiaryBank8', 'BeneficiaryBank9',
      'BeneficiaryBank10', 'BeneficiaryBank11', 'BeneficiaryBank12',
      'BeneficiaryBank13', 'BeneficiaryBank14', 'BeneficiaryBank15',
      'BeneficiaryBank16', 'BeneficiaryBank17', 'BeneficiaryBank18',
      'BeneficiaryBank19', 'BeneficiaryBank20',
      'FCRABankDetails', 'localBankDetails',
      'otherBankDetails', 'otherBankDetails1', 'otherBankDetails2',
      'otherBankDetails3', 'otherBankDetails4',
    ];

    const logs = [];

    for (const field of bankFields) {
      const prevBank = previousDivision?.[field as keyof IDivision];
      const newBank = newDivision?.[field as keyof IDivision];

      if (!prevBank && newBank) {
        // Bank added
        logs.push({
          divName: newDivision?.details?.name,
          divId: newDivision?._id,
          field: `Bank Added: ${field}/`,
          doneBy: res.locals.authUser._id,
        });
      } else if (prevBank && newBank && JSON.stringify(prevBank) !== JSON.stringify(newBank)) {
        // Bank updated
        logs.push({
          divName: newDivision?.details?.name,
          divId: newDivision?._id,
          field: `Bank Updated: ${field}`,
          doneBy: res.locals.authUser._id,
        });
      } else if (prevBank && !newBank) {
        // Bank removed
        logs.push({
          divName: newDivision?.details?.name,
          divId: newDivision?._id,
          field: `Bank Removed: ${field}/`,
          doneBy: res.locals.authUser._id,
        });
      }
    }
    console.log(logs, 'lododod');
    // Save all logs
    const bbb= await DivisionUpdateLog.insertMany(logs);
    console.log(bbb, ';0909');
    console.log(previousDivision.details.juniorLeader?.name?.toString(), 'signb8 prev');
    console.log(newDivision.details.juniorLeader?.name?.toString(), 'signb8 new');

    if (previousDivision.details.coordinator?.sign?._id?.toString() !== newDivision.details.coordinator?.sign?._id?.toString()) {
      await new DivisionUpdateLog({
        divName: newDivision?.details.name,
        divId: newDivision._id,
        field: 'Coordinator Sign',
        doneBy: res.locals.authUser._id,
      }).save();
    } else {
      console.log('No change in Coordinator Sign');
    }
    if (previousDivision.details.coordinator?.name?._id?.toString() !== newDivision.details.coordinator?.name?._id?.toString()) {
      await new DivisionUpdateLog({
        divName: newDivision?.details.name,
        divId: newDivision._id,
        field: 'Coordinator Name',
        doneBy: res.locals.authUser._id,
      }).save();
    } else {
      console.log('No change in Coordinator Sign');
    }
    if (previousDivision.details.prevCoordinator?.sign?.toString() !== newDivision.details.prevCoordinator?.sign?.toString()) {
      await new DivisionUpdateLog({
        divName: newDivision?.details.name,
        divId: newDivision._id,
        field: 'Prev Coordinator Sign',
        doneBy: res.locals.authUser._id,
      }).save();
    } else {
      console.log('No change in Coordinator Sign');
    }
    if (previousDivision.details.juniorLeader?.sign?.toString() !== newDivision.details.juniorLeader?.sign?.toString()) {
      await new DivisionUpdateLog({
        divName: newDivision?.details.name,
        divId: newDivision._id,
        field: 'juniorLeader 1 Sign',
        doneBy: res.locals.authUser._id,
      }).save();
    } else {
      console.log('No change in juniorLeader 1 Sign');
    }
    if (previousDivision.details.juniorLeader?.name?.toString() !== newDivision.details.juniorLeader?.name?.toString()) {
      await new DivisionUpdateLog({
        divName: newDivision?.details.name,
        divId: newDivision._id,
        field: 'juniorLeader 1 Name',
        doneBy: res.locals.authUser._id,
      }).save();
    } else {
      console.log('No change in juniorLeader 1 Sign');
    }
    if (previousDivision.details.prevJuniorLeader1?.sign?.toString() !== newDivision.details.prevJuniorLeader1?.sign?.toString()) {
      await new DivisionUpdateLog({
        divName: newDivision?.details.name,
        divId: newDivision._id,
        field: 'Prev juniorLeader 1 Sign',
        doneBy: res.locals.authUser._id,
      }).save();
    } else {
      console.log('No change in juniorLeader 1 Sign');
    }
    if (previousDivision.details.seniorLeader?.sign?.toString() !== newDivision.details.seniorLeader?.sign?.toString()) {
      await new DivisionUpdateLog({
        divName: newDivision?.details.name,
        divId: newDivision._id,
        field: 'juniorLeader 2 Sign',
        doneBy: res.locals.authUser._id,
      }).save();
    } else {
      console.log('No change in juniorLeader 2 Sign');
    }
    if (previousDivision.details.seniorLeader?.name?.toString() !== newDivision.details.seniorLeader?.name?.toString()) {
      await new DivisionUpdateLog({
        divName: newDivision?.details.name,
        divId: newDivision._id,
        field: 'juniorLeader 2 Name',
        doneBy: res.locals.authUser._id,
      }).save();
    } else {
      console.log('No change in juniorLeader 2 Sign');
    }
    if (previousDivision.details.prevJuniorLeader2?.sign?.toString() !== newDivision.details.prevJuniorLeader2?.sign?.toString()) {
      await new DivisionUpdateLog({
        divName: newDivision?.details.name,
        divId: newDivision._id,
        field: 'Prev juniorLeader 2 Sign',
        doneBy: res.locals.authUser._id,
      }).save();
    } else {
      console.log('No change in juniorLeader 2 Sign');
    }


    // const getData=((previousDivision:any, newDivision:any)=>{
    //   const changedFields: { field: string; oldValue: any; newValue: any; }[] = [];
    //   const schemaPaths = Object.keys(previousDivision.toObject()); // Get all schema field names

    //   schemaPaths.forEach((field) => {
    //     const previousValue = previousDivision[field];
    //     const newValue = newDivision[field];

    //     // Skip comparing the _id and timestamps as they are not relevant for logging changes
    //     if (field === '_id' || field === 'createdAt' || field === 'updatedAt' || field === 'createdBy'|| previousValue=== ObjectId) return;

    //     // Compare the values; handle ObjectId and direct values
    //     if (previousValue?.toString() !== newValue?.toString()) {
    //       changedFields.push({
    //         field,
    //         oldValue: previousValue,
    //         newValue: newValue,
    //       });
    //     }
    //   });

    //   return changedFields;
    // });
    // const changedFields = getData(previousDivision, newDivision);
    // console.log(changedFields, 'changedFields');

    // If changes are detected, log them
    // if (changedFields.length > 0) {
    //   // Loop through each changed field and create a separate log
    //   for (const change of changedFields) {
    //     const logMessage = `${change.field}: ${change.oldValue} -> ${change.newValue}`;
    //     console.log(logMessage, 'logMessage');

    //     // Save a new transaction log for each change
    //     const logs= await new DivisionUpdateLog({
    //       divName: change.field,
    //       divId: newDivision._id,
    //       field: change.field,
    //       doneBy: res.locals.authUser._id,
    //     }).save();
    //     console.log(logs, 'logs88');
    //   }
    // }
    sendStandardResponse(res, 'OK', {
      data: newDivision,
      message: 'Successfully updated division',
    });
    console.log(newDivision?.details?.coordinator?.name?._id, 'Near emit');
    divisionEvents.emit('update', {data: {previousDivision, newDivision}});
  } catch (error) {
    next(error);
  }
});

/**
 * For deleting a division (Actually it's just updating the status to 'deleted')
 * [DELETED] /division/divisions/{division id}
 *
 * @author <sanjaymonsailas@gmail.com>, <@sanjaymonsailas>
 *
 * ✍🏻
 */
divisionRouter.delete('/:divisionId', authCheck(['WRITE_DIVISIONS']), async (req, res, next) => {
  try {
    const DefaultPermissions = {
      READ_ACCESS: false,
      READ_WORKERS: false,
      WRITE_WORKERS: false,
      READ_STAFFS: false,
      READ_DIVISIONS: false,
      READ_ALL_DIVISIONS: false,
      READ_FR: false,
      WRITE_FR: false,
      READ_IRO: false,
      WRITE_IRO: false,
      READ_APPLICATION: false,
      WRITE_APPLICATION: false,
    };

    const division = await Division.findOneAndUpdate({_id: req.params.divisionId}, {status: CommonLifeCycleStates.DELETED}, {new: true});
    const subDivisions = await SubDivision.find({division: req.params.divisionId});
    subDivisions.forEach(async (subDivision) => {
      await subDivision.updateOne({status: CommonLifeCycleStates.DELETED}, {new: true});
      // await subDivision.save();
      subDivisionEvents.emit('delete', {data: subDivision});
    });
    console.log(division?.details?.coordinator?.name, 'divisions');

    const personID=division?.details?.coordinator?.name;

    const userPermission = await User.findById(personID);
    console.log(userPermission, 'userPermission');

    if (userPermission) {
      const resetPermission = await UserPermissions.findByIdAndUpdate(
        userPermission.permissions,
        DefaultPermissions);
      if (resetPermission) {
        console.log('old user user - id:', personID, ' reseted permission to default');
      } else {
        console.log('not reseted');
      }
    } else {
      console.log('not found userPermission');
    }
    if (!division && !subDivisions) {
      return next(new Error('Division ID Not found'));
    }
    if (division != null) {
      sendStandardResponse(res, 'OK', {
        data: division,
        message: 'Successfully deleted Division and Sub-Division',
      });
      divisionEvents.emit('delete', {data: division});
    }
  } catch (error) {
    next(error);
  }
});

/**
 * For deleting a division (Actually it's just updating the status to 'deleted')
 * [DELETED] /division/divisions/{division id}
 *
 * @author <sanjaymonsailas@gmail.com>, <@sanjaymonsailas>
 *
 * ✍🏻
 */
divisionRouter.delete('/:divisionId/force', authCheck(['WRITE_DIVISIONS']), async (req, res, next) => {
  try {
    const division = await Division.findOneAndDelete({_id: req.params.divisionId});
    if (!division) {
      return next(new Error('Division ID Not found'));
    }
    sendStandardResponse(res, 'OK', {
      data: division,
      message: 'Successfully force deleted division',
    });
    // divisionEvents.emit('forceDelete', {data: division});
  } catch (error) {
    next(error);
  }
});


export default divisionRouter;
