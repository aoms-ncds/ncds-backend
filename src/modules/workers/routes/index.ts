import {Router} from 'express';
import {MongoError, ObjectId} from 'mongodb';
import authCheck from '../../../extras/auth_check';
import Worker, {IWorker} from '../models/Worker';
import {sendStandardResponse} from '../../../extras/helpers';
import workerEvents from '../events/workers_events';
import mongoose, {FilterQuery} from 'mongoose';
import {FormattedCode} from '../../../models/FormattedCode';
import WorkerLifeCycleStates from '../extras/WorkerLifeCycleStates';
import Spouse from '../models/Spouse';
import Child, {IChild} from '../models/Child';
import childSupportRouter from './childSupport';
import spouseRouter from './spouse';
import GoogleDrive from '../../../extras/google/GoogleDrive';
import fs from 'fs';
import multer from 'multer';
import childrenRouter from './children';
import {IRemark} from '../models/remarks';
import workerRemarks from '../models/remarks';
import CommonLifeCycleStates from '../../../extras/CommonLifeCycleStates';
import SubDivision, {ISubDivision} from '../../divisions/models/SubDivision';
import User from '../../users/models/User';
import FilePath from '../../fileUploader/extras/fileConfig';
import {ISupportStructure} from '../../users/extras/user_types';
import Division from '../../divisions/models/Division';
import Designation from '../../HR/models/Designation';
import DesignationParticulars from '../../settings/models/designationParticulars';
import {compareAndLog, logDivChange} from '../../users/extras/updateLog';
import UserUpdateLog, {IUserUpdateLog} from '../../users/models/userUpdateLog';
import Staff from '../../HR/models/Staff';
import diffObjects from '../extras/differWorker';
import FR from '../../FR/models/FR';
import IRO from '../../IRO/models/IRO';

const workersRouter = Router();
workersRouter.use('/childSupport', childSupportRouter);
workersRouter.use('/spouse', spouseRouter);
workersRouter.use('/children', childrenRouter);

/**
 * For getting a count of all Assosiates
 * [GET] /workers/count
 * [GET] /workers/count?status=0 - For getting list of all inactive workers
 * [GET] /workers/count?status=1 - For getting list of all active workers
 * [GET] /workers/count?status=-1 - For getting list of all deleted workers
 *
 * @author <annmariya@computervalley.online>, <@annmariyacomputervalley>
 *
 * 📘
 */
workersRouter.get('/count', authCheck(['READ_ACCESS']), async (req, res, next) => {
  try {
    const conditions: FilterQuery<IWorker> = {
      status: WorkerLifeCycleStates.ACTIVE, // Default to active status
    };
    if (Object.keys(req.query).includes('status')) {
      conditions.status = Number(req.query.status);
    }
    // if (Object.keys(req.query).includes('gender')) {
    //   conditions.gender = (req.query.gender);
    // }
    if (res.locals.authUser.kind == 'worker') {
      conditions.division = res.locals.authUser.division;
    }
    const worker = await Worker.countDocuments(conditions);
    sendStandardResponse<number>(res, 'OK', {
      data: worker,
      message: 'Successfully fetched list of Assosiates',
    });
  } catch (error) {
    next(error);
  }
});
workersRouter.get('/recentActivity', authCheck(['READ_ACCESS']), async (req, res, next) => {
  try {
    // Start & End of Today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const condition = {
      createdAt: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    };

    // Parallel queries (fast)
    const [frCount, iroCount, userCount] = await Promise.all([
      FR.countDocuments(condition),
      IRO.countDocuments(condition),
      User.countDocuments(condition),
    ]);

    const data = {
      FR: frCount,
      IRO: iroCount,
      Users: userCount,
    };

    sendStandardResponse(res, 'OK', {
      data,
      message: 'Successfully fetched today counts',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * For getting a list of all workers
 * @author <athira@computervalley.online>
 *
 * 📘
 */
workersRouter.get('/', authCheck(['READ_WORKERS']), async (req, res, next) => {
  try {
    /*
        Adding filter conditions for getting array of workers based on conditions like:
          1: Active
          2: Inactive
          3: Deleted
      */
    const conditions: FilterQuery<IWorker> = {
      status: WorkerLifeCycleStates.ACTIVE, // Default to active status
    };
    // let sort: Record<string, 1 | -1> = {updatedAt: -1};
    let coordinatorId: ObjectId | undefined;
    if (Object.keys(req.query).includes('status')) {
      conditions.status = Number(req.query.status);
    }
    if (Object.keys(req.query).includes('division')) {
      conditions.division = req.query.division;
      if (Object.keys(req.query).includes('withoutCoordinator')) {
        if (req.query.withoutCoordinator) {
          coordinatorId = (await Division.findById(req.query.division))?.toJSON()?.details.coordinator?.name;
          conditions._id = {$ne: coordinatorId};
          // sort = {workerCode: 1};
        }
      }
    }
    if (res.locals.authUser.kind == 'worker') {
      conditions.division = res.locals.authUser.division;
    }
    let workers = await Worker.find(conditions).select('-password').populate('division').populate('spouse').populate({
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
      .populate('basicDetails.knownLanguages')
      .populate('basicDetails.spouseOf')
      .populate('permissions')
      .populate('basicDetails.gender')
      .populate('supportStructure.pmaDeduction')
      .sort({'basicDetails.firstName': 1});
    if (Object.keys(req.query).includes('withoutSubDivision')) {
      if (req.query.withoutSubDivision) {
        workers = workers.filter((worker) => !worker.officialDetails.divisionHistory[worker.officialDetails.divisionHistory.length - 1].subDivision);
      }
    }

    sendStandardResponse<IWorker[]>(res, 'OK', {
      data: workers,
      message: 'Successfully fetched list of workers',
    });
  } catch (error) {
    next(error);
  }
});
workersRouter.get('/fetchWorker', authCheck(['READ_WORKERS']), async (req, res, next) => {
  try {
    const conditions: FilterQuery<IWorker> = {
      status: WorkerLifeCycleStates.ACTIVE, // Default to active status
    };

    if (Object.keys(req.query).includes('status')) {
      conditions.status = Number(req.query.status);
    }
    if (Object.keys(req.query).includes('division')) {
      conditions.division = req.query.division;
    }
    if (res.locals.authUser.kind == 'worker') {
      conditions.division = res.locals.authUser.division;
    }
    // const { skip = 0, limit = 20 } = req.query;
    console.log(parseInt(req.query.skip as string));
    console.log(parseInt(req.query.limit as string));
    const workers = Worker.find(conditions).select('-password').populate('division').populate('spouse').populate({
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
      .populate('basicDetails.knownLanguages')
      .sort({updatedAt: -1})
      .skip(parseInt(req.query.skip as string))
      .limit(parseInt(req.query.limit as string));

    const finalData = await workers.exec();
    console.log('length', finalData.length);
    sendStandardResponse<IWorker[]>(res, 'OK', {
      data: finalData,
      message: 'Successfully fetched list of workers',
    });
  } catch (error) {
    next(error);
  }
});

workersRouter.get('/searchWorker', authCheck(['READ_WORKERS']), async (req, res, next) => {
  try {
    console.log(req.query, 'req.query.search');
    const conditions: FilterQuery<IWorker> = {
      status: WorkerLifeCycleStates.ACTIVE, // Default to active status
    };

    if (Object.keys(req.query).includes('status')) {
      conditions.status = Number(req.query.status);
    }
    if (Object.keys(req.query).includes('division')) {
      conditions.division = req.query.division;
    }
    if (res.locals.authUser.kind == 'worker') {
      conditions.division = res.locals.authUser.division;
    }
    const searchString = req.query.search as string | undefined;
    const regexPattern = new RegExp(searchString ?? '', 'i');
    const designation = await Designation.findOne({'name': {$regex: regexPattern}});
    const div = await Division.findOne({'details.name': {$regex: regexPattern}});
    const Subdiv = await SubDivision.findOne({'name': {$regex: regexPattern}});

    if (Object.keys(req.query).includes('search')) {
      // Construct a regular expression pattern for case-insensitive matching
      const searchString = req.query.search as string | undefined;
      if (searchString) {
        const regexPattern = new RegExp(searchString, 'i');
        console.log(regexPattern, 'regexPattern');
        conditions['$or'] = [
          {'basicDetails.firstName': {$regex: regexPattern}},
          {'basicDetails.middleName': {$regex: regexPattern}},
          {'basicDetails.lastName': {$regex: regexPattern}},
          {'basicDetails.email': {$regex: regexPattern}},
          {'basicDetails.phone': {$regex: regexPattern}},
          {'division': div?._id},
          {'workerCode': {$regex: regexPattern}},
          {
            $expr: {
              $regexMatch: {
                input: {$concat: ['$basicDetails.firstName', ' ', '$basicDetails.lastName']},
                regex: regexPattern,
              },
            },
          },
          {
            $expr: {
              $regexMatch: {
                input: {$concat: ['$basicDetails.firstName', ' ', '$basicDetails.middleName', ' ', '$basicDetails.lastName']},
                regex: regexPattern,
              },
            },
          },
        ];
      }
    }
    if (designation?._id) {
      conditions?.$or?.push({'supportDetails.designation': designation._id.toString()});
    }
    if (Subdiv?._id) {
      conditions?.$or?.push({'officialDetails.divisionHistory.subDivision': Subdiv?._id ?? ''});
    }
    const workers = Worker.find(conditions).select('-password').populate('division').populate('spouse').populate({
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
      .populate('basicDetails.knownLanguages')
      .sort({updatedAt: -1});
    const finalData = await workers.exec();
    console.log('length', finalData);
    sendStandardResponse<IWorker[]>(res, 'OK', {
      data: finalData,
      message: 'Successfully fetched list of workers',
    });
  } catch (error) {
    next(error);
  }
});

// for uploading profile pic
const upload = multer({
  storage: multer.diskStorage({}),
  limits: {
    fieldSize: 1024 * 1024 * 2, // Increase limit to 2MB (default is 1MB)
  },
  // TODO: ensure that the files are actually getting deleted from the Temp folder after response is sent
});

/**
 * For adding a new worker
 * [POST] /workers/
 *
 * @author <tittu@computervalley.online>
 *
 * 📝
 */
workersRouter.post(
  '/',
  authCheck(['WRITE_WORKERS']),
  upload.fields([{name: 'image', maxCount: 1}, {name: 'image1', maxCount: 10}]),
  async (req, res, next) => {
    // console.log(req.body.worker, 'p645');
    try {
      let imageFile: Express.Multer.File[] = [];
      let image1File;
      if (req.files) {
        imageFile = (req.files as { [fieldname: string]: Express.Multer.File[] })['image1'];
        image1File = (req.files as { [fieldname: string]: Express.Multer.File[] })['image']?.[0];
      } else {
        console.log('req.files is undefined');
      }

      const _worker = JSON.parse(req.body.worker);
      console.log(_worker.basicDetails, '_worker');
      console.log(_worker.officialDetails, '_worker');

      let spouseID = null;
      const userExists = await Worker.findOne({
        'basicDetails.email': _worker?.basicDetails?.email});
      if (userExists && _worker?.basicDetails?.email) {
        return sendStandardResponse(res, 'CONFLICT', {
          error: 'Email already exists',
          message: 'This this email already exists.',
        });
      }
      console.log(userExists, 'userExists432');

      const userExists1 = await Staff.findOne({
        'basicDetails.email': _worker?.basicDetails?.email});
      if (userExists1&& _worker?.basicDetails?.email) {
        return sendStandardResponse(res, 'CONFLICT', {
          error: 'Email already exists',
          message: 'This this email already exists.',
        });
      }
      console.log(userExists, 'staffExists432');

      const workerId = new mongoose.Types.ObjectId();
      // if married worker
      if (_worker.spouse && _worker?.basicDetails.martialStatus == 'Married') {
        spouseID = new mongoose.Types.ObjectId();
        const spouse = new Spouse({
          ..._worker.spouse,
          _id: spouseID,
          spouseCode:
            'WKS' +
            (
              await FormattedCode.findOneAndUpdate(
                {},
                {$inc: {spouseCode: 1}},
                {new: true},
              )
            )?.spouseCode
              .toString()
              .padStart(5, '0'),
          spouseOf: workerId,
          status: WorkerLifeCycleStates.CREATED,
          division: _worker?.officialDetails.divisionHistory[0].division,
          insurance: _worker.spouse.insurance,
        });
        await spouse.validate();
        spouse.save();
      }
      const img: { id: string, url: string }[] = [];
      if (imageFile) {
        const imgUploadPromises = imageFile.map(async (imgField, indx) => {
          if (imgField.fieldname === 'image1') {
            const fileID = await GoogleDrive.uploadFile({
              name: imgField.fieldname,
              body: fs.createReadStream(imgField.path),
              mimeType: imgField.mimetype,
              makePublic: true,
              parents: [FilePath.Profile_Pic],
            });

            img.push({id: req.body.childImageIds[indx], url: `https://drive.google.com/uc?id=${fileID}&export=download`});
            console.log('Uploaded user image to Google Drive');
          }
        });

        await Promise.all(imgUploadPromises); // Wait for all uploads to finish
      }
      const workerCode = 'WK' +
        (
          await FormattedCode.findOneAndUpdate(
            {},
            {$inc: {workerCode: 1}},
            {new: true},
          )
        )?.workerCode
          .toString()
          .padStart(5, '0');

      try {
        const worker = new Worker({
          ..._worker,
          _id: workerId,
          createdBy: res.locals.authUser._id,
          division: _worker.officialDetails.divisionHistory[0].division,
          workerCode: workerCode,
          // eSign: _worker.officialDetails?.eSign?._id,

          basicDetails: {
            ..._worker.basicDetails,
            gender: _worker.basicDetails.gender?._id,
            religion: _worker.basicDetails.religion?._id,
            spouseOf: _worker.basicDetails?.spouseOf?._id,
            email: _worker.basicDetails.email != '' ? _worker.basicDetails.email : `${workerCode}@mail.tmp`,
          },
          spouse: spouseID ?? null,
          status: WorkerLifeCycleStates.CREATED,
          children:
                (Array.isArray(_worker.children) ?
                  await Promise.all(
                    _worker.children.map(async (child: IChild) => {
                      const childd = await new Child({
                        ...child,
                        _id: new mongoose.Types.ObjectId(),
                        division: _worker.officialDetails.divisionHistory[0].division,
                        status: WorkerLifeCycleStates.CREATED,
                        eSign: _worker.officialDetails?.eSign?._id,
                        // gender: _worker.children.gender,
                        childCode:
                          'MC' +
                          (
                            await FormattedCode.findOneAndUpdate(
                              {},
                              {$inc: {childCode: 1}},
                              {new: true},
                            )
                          )?.childCode
                            .toString()
                            .padStart(5, '0'),
                        childOf: workerId,
                        childProfile: img.find((_img) => _img?.id === child?._id)?.url,
                      }).save();
                      return childd?._id;
                    }),
                  ) :
                  []
                ) || [],
        });

        // file upload
        if (image1File?.fieldname == 'image' && worker) {
          await GoogleDrive.uploadFile({
            name: `${_worker.basicDetails.firstName} ${_worker.basicDetails.lastName} - ${worker._id}`,
            body: fs.createReadStream(image1File.path),
            mimeType: image1File.mimetype,
            makePublic: true,
            parents: [FilePath.Profile_Pic],
          })
            .then((fileID) => {
              // console.log({ result });
              if (fileID && worker) {
                // if (worker.imageURL) {
                //   const removedFrontPart = worker.imageURL?.substr(31) as string;
                //   const existingFileId = removedFrontPart.substr(
                //     0,
                //     removedFrontPart?.length - 16,
                //   );
                //   GoogleDrive.deleteFile(existingFileId).catch((error) => {
                //     console.log(error);
                //   });
                // }
                worker.imageURL = `https://drive.google.com/uc?id=${fileID}&export=download`;
                // console.log(worker);
                // worker.save();
              }
              console.log('Uploaded user image to Google Drive'.bgYellow);
              // saveOperationLog(
              //   `Uploaded image for ${req.body.user.firstName} ${fileID}`,
              // );
            })
            .catch((error) => {
              console.log(
                'Error uploading user image to Google Drive'.red,
                error,
              );
              // saveErrorLog(error, {bug: true, print: false});
            });
        }
        // console.log('Reached here---4');


        // console.log('Saving worker', worker);
        // await worker.save();
        // console.log('Reached here---5');


        sendStandardResponse(res, 'OK', {
          data: await worker.save(),
          message: 'Successfully added new workers',
        });
        workerEvents.emit('create', {data: worker});
      } catch (error) {
        console.log(error);
      }
    } catch (error) {
      if (
        (error as any) instanceof MongoError &&
        (error as any).code === 11000
      ) {
        // Duplicate entry error
        return sendStandardResponse(res, 'CONFLICT', {
          error: 'Duplicate entry error',
          message: 'This email address is already in use.',
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } else if (error instanceof MongoError || (error as any).message) {
        return sendStandardResponse(res, 'BAD REQUEST', {
          error: error,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          message: (error as any).message,
        });
      }
      next(error);
    } finally {
      // End the session
    }
  });


workersRouter.post(
  '/remarks',
  authCheck([]),
  async (req, res, next) => {
    try {
      const remark = new workerRemarks({
        ...req.body,
        createdBy: res.locals.authUser._id,
      });
      await remark.validate();
      sendStandardResponse(res, 'OK', {
        data: await workerRemarks.populate(await remark.save(), 'createdBy'),
        message: 'Successfully added new Remarks for workers',
      });
      // remarkEvents.emit('create', {data: remark});
    } catch (error) {
      next(error);
    }
  },
);

workersRouter.get(
  '/remarks/:userId',
  authCheck([]),
  async (req, res, next) => {
    try {
      sendStandardResponse<IRemark[]>(res, 'OK', {
        data: await workerRemarks.find({user: req.params.userId}).populate('createdBy'),
        message: 'Successfully fetched Remarks of workers',
      });
    } catch (error) {
      next(error);
    }
  },
);
/**
 * For getting specific division workers
 * [GET] /worker/division/
 */
workersRouter.get(
  '/division/',
  authCheck([]),
  async (req, res, next) => {
    try {
      const workers = await User.find({division: res.locals.authUser.division}).select('-password').populate('division').populate({
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
      });

      sendStandardResponse(res, 'OK', {
        data: workers,
        message: 'Successfully fetched workers of the division',
      });
    } catch (error) {
      next(error);
    }
  },
);

workersRouter.get('/sub_divisions/:id', authCheck([]), async (req, res, next) => {
  try {
    let conditions: FilterQuery<IWorker> = {
      'status': WorkerLifeCycleStates.ACTIVE, // Default to active status
    };
    let coordinatorId: ObjectId | undefined;
    if (Object.keys(req.query).includes('division')) {
      coordinatorId = (await Division.findById(req.query.division))?.toJSON()?.details.coordinator?.name;
      conditions = {
        ...conditions,
        '_id': {$ne: coordinatorId},
      };
    }

    const workers = await Worker.aggregate([
      {
        $addFields: {
          lastSubDivision: {
            $arrayElemAt: ['$officialDetails.divisionHistory', -1],
          },
        },
      },
      {
        $match: {
          'lastSubDivision.subDivision': new ObjectId(req.params.id),
          ...conditions,
        },
      },
      {
        $lookup: {
          from: 'divisions',
          localField: 'division',
          foreignField: '_id',
          as: 'division',
        },
      },
      {
        $unwind: '$division',
      },
      {
        $lookup: {
          from: 'sub_divisions',
          localField: 'lastSubDivision.subDivision',
          foreignField: '_id',
          as: 'lastSubDivisionDetails',
        },
      },
      {
        $unwind: {
          path: '$lastSubDivisionDetails',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          'officialDetails.divisionHistory': {
            $concatArrays: [
              {
                $slice: ['$officialDetails.divisionHistory', {$subtract: [{$size: '$officialDetails.divisionHistory'}, 1]}],
              },
              [{
                subDivision: '$lastSubDivisionDetails',
              }],
            ],
          },
        },
      },
      {
        $sort: {workerCode: 1},
      },
    ]);


    let modifiedWorkers = await Promise.all(workers.map(async (worker) => ({
      ...worker,
      supportDetails: {
        ...worker.supportDetails,
        designation: await Designation.findById(worker.supportDetails.designation),
      },
    })));
    console.log(modifiedWorkers, 'modifiedWorkers1');

    if (Object.keys(req.query).includes('designationParticular')) {
      const designations = (await DesignationParticulars.findById(req.query.designationParticular))?.designations;
      console.log(designations, 'designations');

      if (designations && designations?.length > 0) {
        modifiedWorkers = modifiedWorkers.filter((worker) => designations.includes(worker.supportDetails.designation._id));
      }
      // console.log(designations, conditions);
    }
    sendStandardResponse<IWorker[]>(res, 'OK', {
      data: modifiedWorkers,
      message: 'Successfully fetched workers of sub div',
    });
  } catch (error) {
    next(error);
  }
},
);
workersRouter.get('/designation_particular', authCheck([]), async (req, res, next) => {
  try {
    let conditions: FilterQuery<IWorker> = {
      'status': WorkerLifeCycleStates.ACTIVE, // Default to active status
    };
    let coordinatorId: ObjectId | undefined;
    if (Object.keys(req.query).includes('division')) {
      coordinatorId = (await Division.findById(req.query.division))?.toJSON()?.details.coordinator?.name;
      conditions = {
        ...conditions,
        'division': req.query.division,
        '_id': {$ne: coordinatorId},
      };
    }
    const designations = (await DesignationParticulars.findById(req.query.designationParticular))?.designations;
    if (designations && designations?.length > 0) {
      conditions = {
        ...conditions,
        'supportDetails.designation': {$in: designations},
      };
    }
    // console.log(designations, conditions);

    let workers = await Worker.find({
      ...conditions,
    }).populate('division').populate({
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
    }).sort({workerCode: 1});

    workers = workers.filter((worker) => !worker.officialDetails.divisionHistory[worker.officialDetails.divisionHistory.length - 1].subDivision);

    sendStandardResponse<IWorker[]>(res, 'OK', {
      data: workers,
      message: 'Successfully fetched workers of designation ',
    });
  } catch (error) {
    next(error);
  }
},
);

workersRouter.get('/sub_divisions', authCheck([]), async (req, res, next) => {
  try {
    const subDiv = await SubDivision.find({division: res.locals.authUser.division});
    sendStandardResponse<ISubDivision[]>(res, 'OK', {
      data: subDiv,
      message: 'Successfully fetched ',
    });
    console.log(req.params);
  } catch (error) {
    next(error);
  }
},
);
workersRouter.get('/spouse/:id', authCheck([]), async (req, res, next) => {
  try {
    console.log(req.params.id);
    const userId = req.params.id;
    const data: IWorker | null = await User.findOne({spouse: new mongoose.Types.ObjectId(userId)});
    // console.log(data);
    sendStandardResponse<IWorker | null>(res, 'OK', {
      data: data ?? null,
      message: 'Successfully fetched ',
    });


    console.log(req.params);
  } catch (error) {
    next(error);
  }
},
);
/**
 * For getting a specific worker by id
 */
workersRouter.get(
  '/:workerId',
  authCheck(['READ_WORKERS']),
  async (req, res, next) => {
    try {
      sendStandardResponse<IWorker | null>(res, 'OK', {
        data: await Worker.findById(req.params.workerId)
          .populate('supportStructure.pmaDeduction')
          .select('-password')
          .populate('division')
          .populate('officialDetails.divisionHistory.division')
          .populate('officialDetails.eSign')
          .populate('officialDetails.divisionHistory.subDivision')
          .populate('supportDetails.designation')
          .populate('basicDetails.knownLanguages')
          .populate('basicDetails.communicationLanguage')
          .populate('basicDetails.motherTongue')
          .populate('supportDetails.department')
          .populate('basicDetails.spouseOf')
          .populate('basicDetails.gender')
          .populate('basicDetails.religion')
          // .populate('basicDetails.aadhaar.aadhaarFile')
          // .populate('basicDetails.voterId')
          .populate({
            path: 'basicDetails.aadhaar.aadhaarFile',
            model: 'files',
          })
          .populate({
            path: 'basicDetails.voterId.voterIdFile',
            model: 'files',
          })
          .populate('spouse')
          .populate('children')
          .populate({
            path: 'children',
            populate: {
              path: 'childSupport',
              model: 'child_supports',
            },
          })
          .populate({
            path: 'spouse',
            populate: {
              path: 'knownLanguages',
              model: 'languages',
            },
          }).sort({'basicDetails.firstName': 1}), // Sorting by first name in ascending order

        message: 'Successfully fetched Worker',
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * For Get  a IRO log by Id
 * [GET] /workers/{workerId}/log
 *
 * ✍🏻
 */
workersRouter.get('/:workerId',
  authCheck(['MANAGE_WORKER']),
  async (req, res, next) => {
    try {
      sendStandardResponse<IUserUpdateLog[] | null>(res, 'OK', {
        data: await UserUpdateLog.find({userId: req.params.workerId}).populate('doneBy').sort({createdAt: 1}),
        message: 'Successfully fetched user log',
      });
    } catch (error) {
      next(error);
    }
  });
/**
 * For updating a worker
 * [PATCH] /workers/{worker id}
 *
 * @author <tittu@computervalley.online>
 *
 * ✍🏻
 */
workersRouter.patch(
  '/:workerId',
  authCheck(['WRITE_WORKERS']),
  upload.fields([{name: 'image', maxCount: 1}, {name: 'image1', maxCount: 10}]),
  async (req, res, next) => {
    let imageFile;
    let image1File;


    console.log(req.body.worker.basicDetails, 'datas98');
    if (req.files) {
      imageFile = (req.files as { [fieldname: string]: Express.Multer.File[] })['image1'];
      image1File = (req.files as { [fieldname: string]: Express.Multer.File[] })['image']?.[0];
    } else {
      console.log('req.files is undefined');
    }
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const previousWorker = await Worker.findById(req.params.workerId)
        .populate('officialDetails.divisionHistory.division')
        .populate('officialDetails.divisionHistory.subDivision')
        .populate('supportDetails.designation')
        .populate('basicDetails.knownLanguages')
        .populate('basicDetails.communicationLanguage')
        .populate('basicDetails.motherTongue')
        .populate('supportStructure.pmaDeduction')
        .populate('spouse')
        .populate('children')
        .populate('children.childSupport');
      const _newWorker = JSON.parse(req.body.worker);
      console.log(_newWorker.children, '_newWorker88');
      if (previousWorker?.basicDetails.email != _newWorker.basicDetails.email) {
        const userExists = await Worker.findOne({
          'basicDetails.email': _newWorker?.basicDetails.email});
        if (userExists&&_newWorker.basicDetails.email) {
          return sendStandardResponse(res, 'CONFLICT', {
            error: 'Email already exists',
            message: ' This email already exists.',
          });
        }
      }
      const userExists1 = await Staff.findOne({
        'basicDetails.email': _newWorker?.basicDetails.email});
      if (userExists1) {
        return sendStandardResponse(res, 'CONFLICT', {
          error: 'Email already exists',
          message: 'A Staff with this email already exists.',
        });
      }

      let spouseID;
      if (!previousWorker) {
        return sendStandardResponse(res, 'OK', {
          message: 'No worker is found with the matching id!',
        });
      }
      if (
        !previousWorker.spouse &&
        (previousWorker.basicDetails.martialStatus != 'Married') &&
        _newWorker.spouse &&
        (_newWorker.basicDetails.martialStatus == 'Married')
      ) {
        spouseID = new mongoose.Types.ObjectId();
        const newSpouse = new Spouse({
          ..._newWorker.spouse,
          _id: spouseID,
          spouseOf: req.params?.workerId,
          status: WorkerLifeCycleStates.ACTIVE,
          division: _newWorker.officialDetails.divisionHistory[_newWorker.officialDetails.divisionHistory.length - 1].division,
          insurance: _newWorker.spouse.insurance,
          spouseCode:
            'WKS' +
            (
              await FormattedCode.findOneAndUpdate(
                {},
                {$inc: {spouseCode: 1}},
                {new: true},
              )
            )?.spouseCode
              .toString()
              .padStart(5, '0'),
        });
        newSpouse.save();
      } else if (_newWorker.spouse) {
        // To update an existing spouse
        console.log('Updating Existing Spouse');
        spouseID = previousWorker?.spouse?._id;

        const newSpouse = await Spouse.findByIdAndUpdate(
          previousWorker?.spouse?._id,
          {
            ..._newWorker.spouse,
            division: _newWorker.officialDetails.divisionHistory[_newWorker.officialDetails.divisionHistory.length - 1].division,
            insurance: _newWorker.spouse.insurance,
          },
          {new: true},
        );
        if (newSpouse) {
          newSpouse.save();
        }
        // if (_newWorker.spouse.widowCare == false) {
        //   const dd = await Spouse.findByIdAndUpdate(
        //     previousWorker?.spouse?._id,
        //     {
        //       ..._newWorker.spouse,
        //       aadharNo: '',

        //     },
        //     {new: true},
        //   );
        //   dd?.save();
        // }
      }

      // If the Worker is getting updated in Sendback Assosiates Page(REJECTED) then status will be updated to Approval New worker Page(CREATED)
      const Status = _newWorker.status == CommonLifeCycleStates.REJECTED ? CommonLifeCycleStates.CREATED : _newWorker.status;
      const img: { id: string, url: string }[] = [];
      if (imageFile) {
        const imgUploadPromises = imageFile.map(async (imgField, indx) => {
          if (imgField.fieldname === 'image1') {
            const fileID = await GoogleDrive.uploadFile({
              name: imgField.fieldname,
              body: fs.createReadStream(imgField.path),
              mimeType: imgField.mimetype,
              makePublic: true,
              parents: [FilePath.Profile_Pic],
            });
            if (fileID) {
              img.push({id: req.body.childImageIds[indx], url: `https://drive.google.com/uc?id=${fileID}&export=download`});
              // console.log(worker);
              // worker.save();
            }
            console.log('Uploaded user image to Google Drive');
          }
        });
        // console.log({ result });

        console.log('Uploaded user image to Google Drive'.bgYellow);
        // saveOperationLog(
        //   `Uploaded image for ${req.body.user.firstName} ${fileID}`,
        // );
        await Promise.all(imgUploadPromises); // Wait for all uploads to finish
      }


      let supportStructure: ISupportStructure = {...(_newWorker as IWorker).supportStructure};
      console.log(previousWorker, 'supportStructure443');

      if (previousWorker.supportStructure?.basic != supportStructure.basic) {
        supportStructure = {...supportStructure, prevBasic: previousWorker.supportStructure?.basic, basicLastUpdatedAt: new Date()};
      }
      if (previousWorker.supportStructure?.HRA != supportStructure.HRA) {
        supportStructure = {...supportStructure, prevHRA: previousWorker.supportStructure?.HRA, HRALastUpdatedAt: new Date()};
      }
      if (previousWorker.supportStructure?.spouseAllowance != supportStructure.spouseAllowance) {
        supportStructure = {...supportStructure, prevSpouseAllowance: previousWorker.supportStructure?.spouseAllowance, spouseAllowanceLastUpdatedAt: new Date()};
      }
      if (previousWorker.supportStructure?.positionalAllowance != supportStructure.positionalAllowance) {
        supportStructure = {...supportStructure, prevPositionalAllowance: previousWorker.supportStructure?.positionalAllowance, positionalAllowanceLastUpdatedAt: new Date()};
      }
      if (previousWorker.supportStructure?.specialAllowance != supportStructure.specialAllowance) {
        supportStructure = {...supportStructure, prevSpecialAllowance: previousWorker.supportStructure?.specialAllowance, specialAllowanceLastUpdatedAt: new Date()};
      }
      if (previousWorker.supportStructure?.impactDeduction != supportStructure.impactDeduction) {
        supportStructure = {...supportStructure, prevImpactDeduction: previousWorker.supportStructure?.impactDeduction, impactDeductionLastUpdatedAt: new Date()};
      }
      if (previousWorker.supportStructure?.telAllowance != supportStructure.telAllowance) {
        supportStructure = {...supportStructure, prevTelAllowance: previousWorker.supportStructure?.telAllowance, telAllowanceLastUpdatedAt: new Date()};
      }
      if (previousWorker.supportStructure?.PIONMissionaryFund != supportStructure.PIONMissionaryFund) {
        supportStructure = {...supportStructure, prevPIONMissionaryFund: previousWorker.supportStructure?.PIONMissionaryFund, PIONMissionaryFundLastUpdatedAt: new Date()};
      }
      if (previousWorker.supportStructure?.MUTDeduction != supportStructure.MUTDeduction) {
        supportStructure = {...supportStructure, prevMUTDeduction: previousWorker.supportStructure?.MUTDeduction, MUTDeductionLastUpdatedAt: new Date()};
      }
      if (previousWorker.supportStructure?.pmaDeduction?._id != supportStructure.pmaDeduction?._id) {
        supportStructure = {...supportStructure, prevPmaDeduction: previousWorker.supportStructure?.pmaDeduction?.amount, pmaDeductionLastUpdatedAt: new Date()};
      }

      console.log(supportStructure, 'supportStructure0');

      const {workerId} = req.params;
      const {officialDetails, basicDetails, children: workerChildren} = _newWorker;

      // Get the latest division from the division history
      const latestDivisionHistory = officialDetails.divisionHistory[officialDetails.divisionHistory.length - 1];
      const latestDivision = latestDivisionHistory.division;

      // Map through children and update or create new ones
      const children = Array.isArray(workerChildren) ?
        await Promise.all(
          workerChildren.map(async (child: mongoose.UpdateQuery<IChild>) => {
            const childDoc = child._id.length > 3 && await Child.findById(child._id).populate('childSupport');
            if (childDoc) {
              // console.log(childDoc.childSupport?.amount, '8788');
              console.log('Updating Child');
              await Child.findByIdAndUpdate(child._id, {
                ...child,
                division: latestDivision,
                childProfile: img.find((_img) => _img.id === child._id)?.url ?? child.childProfile,
              });
              if (
                child.childSupport?._id &&
                childDoc.childSupport?._id &&
                child.childSupport._id !== childDoc.childSupport._id
              ) {
                const childData = await Child.findByIdAndUpdate(
                  child._id,
                  {
                    $set: {
                      prevCeaAmount: childDoc.childSupport.amount, // Store previous amount
                      prevCeaAmountDate: new Date(), // Store timestamp of change
                    },
                  },
                  {new: true}, // Ensure updated document is returned
                );

                console.log(childData, 'childDoc988'); // Log the updated document
              } else {
                await Child.findByIdAndUpdate(child._id, {
                  ...child,
                  division: latestDivision,
                  childProfile: img.find((_img) => _img.id === child._id)?.url ?? child.childProfile,
                });
              }
              console.log(child, 'child?.supportEnabled');
              console.log(child?.supportEnabled, 'child?.supportEnabled');
              if (child?.supportEnabled == true) {
                await Child.updateOne(
                  {_id: new ObjectId(child._id)},
                  {
                    $set:
                    {
                      reason: ' ',
                      disabledTo: '',
                      disabledFrom: '',
                    },
                  },
                );
              }
              return childDoc._id;
            } else {
              console.log('Adding New Child');
              const newChildCode = (
                await FormattedCode.findOneAndUpdate(
                  {},
                  {$inc: {childCode: 1}},
                  {new: true},
                )
              )?.childCode
                .toString()
                .padStart(5, '0');

              const newChild = await new Child({
                ...child,
                childOf: workerId,
                status: WorkerLifeCycleStates.ACTIVE,
                division: latestDivision,
                childCode: `MC${newChildCode}`,
                childProfile: img.find((_img) => _img.id === child._id)?.url,
                _id: new mongoose.Types.ObjectId(),
              }).save();

              return newChild._id;
            }
          }),
        ) :
        [];

      const newWorker = await Worker.findByIdAndUpdate(
        workerId,
        {
          ..._newWorker,
          supportStructure: {
            ...supportStructure,
          },
          status: Status,
          spouse: spouseID,
          basicDetails: {
            ...basicDetails,
            gender: basicDetails?.gender?._id,
            religion: basicDetails?.religion?._id,
            spouseOf: basicDetails?.spouseOf?._id,
          },
          division: latestDivision,
          children,
        },
        {new: true},
      )
        .populate('officialDetails.divisionHistory.division')
        .populate('officialDetails.divisionHistory.subDivision')
        .populate('supportDetails.designation')
        .populate('basicDetails.knownLanguages')
        .populate('basicDetails.communicationLanguage')
        .populate('basicDetails.motherTongue')
        .populate('spouse')
        .populate('children')
        .populate('children.childSupport');
      // eslint-disable-next-line guard-for-in

      if (!previousWorker || !newWorker) {
        return next(new Error('worker ID Not found'));
      }
      if (_newWorker.officialDetails.status == 'Left') {
        await Worker.updateOne({_id: req.params.workerId}, {
          $set: {
            'officialDetails.reasonForDeactivation': _newWorker.officialDetails.reasonForDeactivation.reason,
            'status': WorkerLifeCycleStates.INACTIVE,
          },
        });
      } else if (_newWorker.officialDetails.status == 'Active') {
        await Worker.updateOne({_id: req.params.workerId}, {
          $set: {
            'officialDetails.reasonForDeactivation': '',
            'status': WorkerLifeCycleStates.ACTIVE,
          },
        });
      }
      // file upload
      if (image1File?.fieldname == 'image' && newWorker) {
        await GoogleDrive.uploadFile({
          name: `${_newWorker.basicDetails.firstName} ${_newWorker.basicDetails.lastName} - ${newWorker._id}`,
          body: fs.createReadStream(image1File.path),
          mimeType: image1File.mimetype,
          makePublic: true,
          parents: [FilePath.Profile_Pic],
        })
          .then((fileID) => {
            // console.log({ result });
            if (fileID && newWorker) {
              if (newWorker.imageURL) {
                const removedFrontPart = newWorker.imageURL?.substr(31) as string;
                const existingFileId = removedFrontPart.substr(
                  0,
                  removedFrontPart?.length - 16,
                );
                GoogleDrive.deleteFile(existingFileId).catch((error) => {
                  console.log(error);
                });
              }

              newWorker.imageURL = `https://drive.google.com/uc?id=${fileID}&export=download`;
              // console.log(worker);
              newWorker.save();
            }
            console.log('Uploaded user image to Google Drive'.bgYellow);
          })
          .catch((error) => {
            console.log(
              'Error uploading user image to Google Drive'.red,
              error,
            );
            // saveErrorLog(error, {bug: true, print: false});
          });
      }


      if (_newWorker.supportStructure?.supportEnabled == 'true') {
        console.log(req.params.workerId, 'rtur');
        await Worker.updateOne(
          {_id: new ObjectId(req.params.workerId)},
          {
            $set:
            {
              'supportStructure.reason': ' ',
              'supportStructure.disabledTo': '',
              'supportStructure.disabledFrom': '',
            },
          },
        );
      }
      // if (_newWorker.spouse?.widowCare == false) {
      //   await Worker.updateOne(
      //     {_id: new ObjectId(req.params.workerId)},
      //     {
      //       $set:
      //       {
      //         'supportStructure.reason': ' ',

      //       },
      //     },
      //   );
      // }
      // eslint-disable-next-line guard-for-in
      // Convert Mongoose documents to plain objects if needed
      // If using Mongoose, ensure you call `.toObject()` on documents
      if (previousWorker && newWorker) {
        const prevWorkerObj: IWorker = previousWorker instanceof mongoose.Document ? previousWorker.toObject() : previousWorker;
        const newWorkerObj = newWorker instanceof mongoose.Document ? newWorker.toObject() : newWorker;
        if (!prevWorkerObj.division.equals(newWorker.division)) {
          logDivChange( workerId, res.locals.authUser._id, prevWorkerObj.workerCode as string, 'div');
        } else {
          const prevSubDiv = prevWorkerObj.officialDetails.divisionHistory.at(-1)?.subDivision?._id;
          const newSubDiv = newWorkerObj.officialDetails.divisionHistory.at(-1)?.subDivision?._id;
          if (
            (prevSubDiv && !newSubDiv) || // Previous exists, but new does not
            (!prevSubDiv && newSubDiv) || // New exists, but previous does not
            (prevSubDiv && newSubDiv && !prevSubDiv.equals(newSubDiv)) // Both exist but are not equal
          ) {
            logDivChange( workerId, res.locals.authUser._id, prevWorkerObj.workerCode as string, 'subDiv');
          }
        }
        compareAndLog(prevWorkerObj, newWorkerObj, '', workerId, res.locals.authUser._id, prevWorkerObj.workerCode as string, 'user');
      }

      const changes = diffObjects(previousWorker?.toObject(), newWorker?.toObject());
      const code=await Worker.findById(req.params.workerId);

      if (changes && changes.length > 0) {
        const logs = changes.map((change: string[]|any) => ({
          userCode: code?.workerCode as string,
          field: change.field,
          userId: workerId,
          doneBy: res.locals.authUser._id,
        }));

        await UserUpdateLog.insertMany(logs);
      }
      if (_newWorker.status == WorkerLifeCycleStates.CREATED ||_newWorker.status == WorkerLifeCycleStates.REJECTED) {
        await Worker.updateOne({_id: req.params.workerId}, {
          $set: {
            'status': WorkerLifeCycleStates.CREATED,
          },
        });
      }
      return sendStandardResponse(res, 'OK', {
        data: newWorker,
        message: 'Successfully updated worker',
      });
      // workerEvents.emit('update', {previousWorker, newWorker}});
    } catch (error) {
      await session.abortTransaction();
      console.error('Transaction aborted:', error);
      next(error);
    } finally {
      // End the session
      session.endSession();
    }
  },
);

/**
 * For 'activate', 'deactivate', 'approve', 'reject' a worker
 * [PATCH] /workers/{worker_id}/{operation}
 *
 * @author <tittu@computervalley.online>
 *
 * ✔️❌
 */
workersRouter.patch(
  '/:workerId/:operation',
  authCheck(['MANAGE_WORKER']),
  async (req, res, next) => {
    try {
      const reason = req.body.reason;
      console.log(reason, 'reason@123');
      console.log(req.params.operation, 'reason@123');

      console.log('reason for deactivation is ', reason);
      if (
        !['activate', 'deactivate', 'approve', 'reject', 'disapprove'].includes(
          req.params.operation,
        )
      ) {
        next(
          new Error(
            'Only activate/deactivate/approve/reject operations are allowed by this API endpoint!',
          ),
        );
      }
      const worker = await Worker.findByIdAndUpdate(
        req.params.workerId,
        {
          $set: {
            'status':
              req.params.operation === 'approve' ?
                WorkerLifeCycleStates.ACTIVE :
                req.params.operation === 'reject' ?
                  WorkerLifeCycleStates.REJECTED :
                  req.params.operation === 'disapprove' ?
                    WorkerLifeCycleStates.DISAPPROVE :
                    req.params.operation === 'activate' ?
                      WorkerLifeCycleStates.ACTIVE :
                      WorkerLifeCycleStates.INACTIVE,
            ...( req.params.operation === 'reject' && {
              reasonForReject: req.body.reason,
            }),
            ...( req.params.operation === 'disapprove' && {
              reasonForDisapprove: req.body.reasonDisapprove,
            }),
            ...( req.params.operation === 'reject' && {
              reasonForReject: req.body.reason,
            }),
            ...(req.params.operation !== 'activate' && {
              'officialDetails.reasonForDeactivation': reason?.reason,
            }),

          },
        },
        {new: true},
      );

      let spouse;
      let children;
      // eslint-disable-next-line no-unused-vars
      if (req.params.operation === 'approve' || req.params.operation === 'reject') {
        spouse = await Spouse.findOneAndUpdate(
          {spouseOf: req.params.workerId},
          {
            $set: {
              status:
                req.params.operation === 'approve' ?
                  WorkerLifeCycleStates.ACTIVE :
                  WorkerLifeCycleStates.REJECTED,
              // :
              // req.params.operation === 'activate' ?
              //   WorkerLifeCycleStates.ACTIVE :
              //   WorkerLifeCycleStates.INACTIVE,
            },
          },
          {new: true},
        );

        children = await Child.updateMany(
          {childOf: req.params.workerId},
          {
            $set: {
              status:
                req.params.operation === 'approve' ?
                  WorkerLifeCycleStates.ACTIVE :
                  WorkerLifeCycleStates.REJECTED,
              // req.params.operation === 'activate' ?
              //   WorkerLifeCycleStates.ACTIVE :
              //   WorkerLifeCycleStates.INACTIVE,
            },
          },
          // {new: true},
        );
      }


      if (!worker) {
        return next(new Error('workerId ID Not found'));
      }
      // if (!spouse) {
      //   return next(new Error('spouse is not found'));
      // }
      // if (!children) {
      //   return next(new Error('children is not found'));
      // }
      sendStandardResponse(res, 'OK', {
        data: {
          worker: worker,
          spouse: spouse ?? [],
          children: children ?? [],
        }, message: `Successfully ${req.params.operation}d worker`,
      });
      if (req.params.operation === 'activate') {
        workerEvents.emit('activate', {data: worker});
      } else if (req.params.operation === 'approve') {
        workerEvents.emit('approve', {data: worker});
      } else if (req.params.operation === 'reject') {
        workerEvents.emit('reject', {data: worker});
      } else {
        workerEvents.emit('deactivate', {data: worker});
      }
    } catch (error) {
      next(error);
    }
  },
);

/**
 * For deleting a Worker (Actually it's just updating the worker status to 'deleted')
 */
workersRouter.delete(
  '/:workerId',
  authCheck(['WRITE_FR']),
  async (req, res, next) => {
    try {
      // eslint-disable-next-line no-constant-condition
      if (false) {
        // TODO: Prevent any worker from deleting himself
        next(new Error('A worker cannot delete himself!'));
      }
      const worker = await Worker.findOneAndUpdate(
        {_id: req.params.workerId},
        {status: WorkerLifeCycleStates.DELETED},
        {new: true},
      );
      const emailToUpdate = worker?.basicDetails?.email;
      if (emailToUpdate !== undefined) {
        worker!.basicDetails!.email = emailToUpdate + '.deleted';
        await worker!.save();
      } else {
        console.log('Worker object or email property not found.');
      }
      await Child.findOneAndUpdate(
        {childOf: req.params.workerId},
        {status: WorkerLifeCycleStates.DELETED},

      );
      await Spouse.findOneAndUpdate(
        {spouseOf: req.params.workerId},
        {status: WorkerLifeCycleStates.DELETED},

      );

      if (!worker) {
        return next(new Error('Worker ID Not found'));
      }
      sendStandardResponse(res, 'OK', {
        data: worker,
        message: 'Successfully deleted Worker',
      });
      workerEvents.emit('delete', {data: worker});
    } catch (error) {
      next(error);
    }
  },
);


export default workersRouter;
