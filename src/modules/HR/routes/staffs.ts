import e, {Router} from 'express';
import {sendStandardResponse} from '../../../extras/helpers';
import authCheck from '../../../extras/auth_check';
import staffEvents from '../events/staff_events';
import User from '../../users/models/User';
import mongoose, {FilterQuery} from 'mongoose';
import {MongoError} from 'mongodb';
import {FormattedCode} from '../../../models/FormattedCode';
import Staff, {IStaff} from '../models/Staff';
import StaffLifeCycleStates from '../extras/StaffLifeCycleStates';
import GoogleDrive from '../../../extras/google/GoogleDrive';
import fs from 'fs';
import multer from 'multer';
import FilePath from '../../fileUploader/extras/fileConfig';
import PmaDeduction from '../models/pmaDeduction';
import Worker from '../../workers/models/Worker';

const staffsRouter = Router();
// 🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥
/**
 * For getting a list of all staffs
 * [GET] /hr/staff/
 * [GET] /hr/staff?status=0 - For getting list of all inactive staffs
 * [GET] /hr/staff?status=1 - For getting list of all active staffs
 * [GET] /hr/staff?status=-1 - For getting list of all deleted staffs
 *
 * @author <jishnu@computervalley.online>, <@jishnu-cv>
 *
 * 📘
 */
staffsRouter.get('/', authCheck(['READ_ACCESS']), async (req, res, next) => {
  try {
    /*
      Adding filter conditions for getting array of staffs based on conditions like:
        1: Active
        2: Inactive
        3: Deleted
    */
    const conditions: FilterQuery<IStaff> = {
      status: {
        $eq: StaffLifeCycleStates.ACTIVE, // Equals ACTIVE
        $ne: StaffLifeCycleStates.DELETED, // Not equals DELETED
      }, // Default to active status
    };
    if (Object.keys(req.query).includes('status')) {
      conditions.status = Number(req.query.status);
    }

    sendStandardResponse<IStaff[]>(res, 'OK', {
      data: await Staff.find(conditions)
        .select('-password')
        .populate('division')
        .populate({
          path: 'officialDetails',
          populate: {
            path: 'divisionHistory',
            populate: {
              path: 'subDivision',
              model: 'sub_divisions',
            },
          },
        })
        .populate({
          path: 'supportDetails',
          populate: {
            path: 'designation',
            model: 'designations',
          },
        }),
      message: 'Successfully fetched list of staffs',
    });
  } catch (error) {
    next(error);
  }
});
/**
 * For getting a list of all staffs
 * [GET] /hr/staff/count
 * [GET] /hr/staff/count?status=0 - For getting count of all inactive staffs
 * [GET] /hr/staff/count?status=1 - For getting count of all active staffs
 * [GET] /hr/staff/count?status=-1 - For getting count of all deleted staffs
 *
 * @author <jishnu@computervalley.online>, <@jishnu-cv>
 *
 * 📘
 */
staffsRouter.get(
  '/count',
  authCheck(['READ_ACCESS']),
  async (req, res, next) => {
    try {
      /*
      Adding filter conditions for getting count of staffs based on conditions like:
        1: Active
        2: Inactive
        3: Deleted
    */
      const conditions: FilterQuery<IStaff> = {
        status: StaffLifeCycleStates.ACTIVE, // Default to active status
      };
      if (Object.keys(req.query).includes('status')) {
        conditions.status = Number(req.query.status);
      }

      sendStandardResponse<number>(res, 'OK', {
        data: await Staff.countDocuments(conditions),
        message: 'Successfully fetched list of staffs',
      });
    } catch (error) {
      next(error);
    }
  },
);

// 🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥

const upload = multer({
  storage: multer.diskStorage({}),
  // TODO: ensure that the files are actually getting deleted from the Temp folder after response is sent
});

/**
 * For adding a new staff
 * [POST] /hr/staff/
 *
 * @author <jishnu@computervalley.online>, <@jishnu-cv>
 *
 * 📝
 */
staffsRouter.post(
  '/',
  authCheck(['READ_ACCESS']),
  upload.single('image'),
  async (req, res, next) => {
    try {
      const staff = new Staff({
        ...req.body.staff,
        _id: new mongoose.Types.ObjectId(),
        createdBy: res.locals.authUser._id,
        staffCode: 'IETWK',
        status: StaffLifeCycleStates.ACTIVE,
        division: req.body.staff.officialDetails.divisionHistory[0].division,
        officialDetails: {
          ...req.body.staff.officialDetails,
          eSign: req.body.staff.officialDetails.eSign?._id,
        },
      });
      const userExists = await Staff.findOne({
        'basicDetails.email': req.body.staff.basicDetails.email});
      if (userExists&&req.body.staff.basicDetails.email) {
        return sendStandardResponse(res, 'CONFLICT', {
          message: 'A staff with this email already exists.',
          error: 'Email already exists',
        });
      }
      const userExists1 = await Worker.findOne({
        'basicDetails.email': req.body.staff.basicDetails.email});
      if (userExists1&&req.body.staff.basicDetails.email) {
        return sendStandardResponse(res, 'CONFLICT', {
          message: 'A Worker with this email already exists.',
          error: 'Email already exists',
        });
      }
      await staff.save(); // Part of the validation includes unique email check, which is done on database server. So we need to .save() instead of .validate()
      staff.staffCode =
        'IETWK' +
        (
          await FormattedCode.findOneAndUpdate(
            {},
            {$inc: {staffCode: 1}},
            {new: true},
          )
        )?.staffCode
          .toString()
          .padStart(5, '0');

      // file upload
      if (req.file && staff) {
        await GoogleDrive.uploadFile({
          name: `${req.body.staff.basicDetails.firstName} ${req.body.staff.basicDetails?.middleName ?? ''} ${req.body.staff.basicDetails.lastName} - ${staff._id}`,
          body: fs.createReadStream(req.file.path),
          mimeType: req.file.mimetype,
          makePublic: true,
          parents: [FilePath.Profile_Pic],
        })
          .then((fileID) => {
            if (fileID && staff) {
              if (staff.imageURL) {
                const removedFrontPart = staff.imageURL?.substr(31) as string;
                const existingFileId = removedFrontPart.substr(
                  0,
                  removedFrontPart?.length - 16,
                );

                GoogleDrive.deleteFile(existingFileId).catch((error) => {
                  sendStandardResponse(res, 'INTERNAL SERVER ERROR', {
                    error: ' File not found',
                    message: 'Something went wrong! Please try again',
                  });
                  console.log(error);
                });
              }
              staff.imageURL = `https://drive.google.com/thumbnail?id=${fileID}&export=download`;
            }

            // staff.save();
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
      } else if (error instanceof MongoError) {
        return sendStandardResponse(res, 'BAD REQUEST', {
          error: error,
          message: error.message,
        });
      }
      next(error);
    }
  },
);

staffsRouter.post('/addPmaDeduction', authCheck(['READ_ACCESS']),
  async (req, res, next) => {
    try {
      console.log(req.body);
      const Pmadedution= new PmaDeduction({...req.body});
      sendStandardResponse(res, 'OK', {
        data: await Pmadedution.save(),
        message: 'Successfully added new Option',
      });
    } catch (error) {
      if (error instanceof MongoError && error.code === 11000) {
        // Duplicate entry error
        return sendStandardResponse(res, 'CONFLICT', {
          error: 'Duplicate entry error',
          message: 'Another gender with the same name already exists!',
        });
      }
      next(error);
    }
  });
staffsRouter.patch('/addPmaDeduction/:id', authCheck(['READ_ACCESS']),
  async (req, res, next) => {
    try {
      console.log(req.body, 'oioii');
      const Pmadedution= await PmaDeduction.findByIdAndUpdate(req.params.id, {...req.body});
      sendStandardResponse(res, 'OK', {
        data: Pmadedution,
        message: 'Successfully added new Option',
      });
    } catch (error) {
      if (error instanceof MongoError && error.code === 11000) {
        // Duplicate entry error
        return sendStandardResponse(res, 'CONFLICT', {
          error: 'Duplicate entry error',
          message: 'Another gender with the same name already exists!',
        });
      }
      next(error);
    }
  });

staffsRouter.get('/getPmaDeduction', authCheck(['READ_ACCESS']),
  async (req, res, next) => {
    try {
      console.log(req.body);
      const Pmadedution= await PmaDeduction.find();
      sendStandardResponse(res, 'OK', {
        data: await Pmadedution,
        message: 'Successfully Options fetch',
      });
    } catch (error) {
      if (error instanceof MongoError && error.code === 11000) {
        // Duplicate entry error
        return sendStandardResponse(res, 'CONFLICT', {
          error: 'Duplicate entry error',
          message: 'Another gender with the same name already exists!',
        });
      }
      next(error);
    }
  });

// ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌
// .... Define all the other APIs above this comment, otherwise below wildcards may consume them, leading unexpected behaviors.....
// ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌ ❌

/**
 * For getting a specific staff by id
 * [GET] /hr/staff/{staff id}
 *
 * @author <jishnu@computervalley.online>, <@jishnu-cv>
 *
 * 📄
 */

staffsRouter.get(
  '/:staffId',
  authCheck(['READ_ACCESS']),
  async (req, res, next) => {
    try {
      sendStandardResponse<IStaff | null>(res, 'OK', {
        data: await Staff.findById(req.params.staffId)
          .select('-password')
          .populate('division')
          .populate('officialDetails.divisionHistory.division')
          .populate('officialDetails.eSign')
          .populate('officialDetails.divisionHistory.subDivision')
          .populate('supportDetails.designation')
          .populate('basicDetails.knownLanguages')
          .populate('basicDetails.communicationLanguage')
          .populate('basicDetails.motherTongue')
          .populate('spouseOfAnother')
          .populate('supportDetails.department'),
        message: 'Successfully fetched staff',
      });
    } catch (error) {
      next(error);
    }
  },
);

// 🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥

/**
 * For activating / deactivating a staff
 * [PATCH] /hr/staff/{staff id}/{operation}
 *
 * @author <jishnu@computervalley.online>, <@jishnu-cv>
 *
 * 👍🏻/👎🏻
 */
staffsRouter.patch(
  '/:staffId/:operation',
  authCheck(['READ_ACCESS']),
  async (req, res, next) => {
    try {
      if (
        !['activate', 'deactivate', 'approve', 'reject'].includes(
          req.params.operation,
        )
      ) {
        next(
          new Error(
            'Only activate/deactivate/approve/reject operations are allowed by this API endpoint!',
          ),
        );
      }
      const staff = await User.findByIdAndUpdate(
        req.params.staffId,
        {
          status:
            req.params.operation === 'approve' ?
              StaffLifeCycleStates.APPROVED :
              req.params.operation === 'reject' ?
                StaffLifeCycleStates.REJECTED :
                req.params.operation === 'activate' ?
                  StaffLifeCycleStates.ACTIVE :
                  StaffLifeCycleStates.INACTIVE,
        },
        {new: true},
      );
      if (!staff) {
        return next(new Error('staffId ID Not found'));
      }
      sendStandardResponse(res, 'OK', {
        data: staff.save(),
        message: `Successfully ${req.params.operation}d staff`,
      });
      // if (req.params.operation === 'activate') {
      //   staffEvents.emit('activate', {data:staff});
      // } else if (req.params.operation === 'approve'){
      //   staffEvents.emit('approve', {data:staff});
      // }else {
      //   staffEvents.emit('deactivate', {data:staff});
      // }
    } catch (error) {
      next(error);
    }
  },
);

// 🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥

/**
 * For updating a staff
 * [PATCH] /hr/staff/{staff id}
 *
 * @author <jishnu@computervalley.online>, <@jishnu-cv>
 *
 * ✍🏻
 */
staffsRouter.delete('/pmaDeduction/:id',
  authCheck(['READ_ACCESS']),
  async (req, res, next) => {
    try {
      // eslint-disable-next-line no-constant-condition
      await PmaDeduction.findOneAndDelete({_id: req.params.id});

      sendStandardResponse(res, 'OK', {
        data: 'Successfully force deleted',
        message: 'Successfully force deleted',
      });
      // staffEvents.emit('forceDelete', {data: staff});
    } catch (error) {
      next(error);
    }
  },
);
staffsRouter.patch(
  '/:staffId',
  authCheck(['READ_ACCESS']),
  upload.single('image'),
  async (req, res, next) => {
    try {
      if (
        Object.keys(req.body.staff).includes('activate') ||
        Object.keys(req.body.staff).includes('deactivate')
      ) {
        next(
          new Error(
            'activate and deactivate fields are allowed by this API endpoint!',
          ),
        );
      }
      const previousStaff = await Staff.findById(req.params.staffId);
      if (previousStaff?.basicDetails.email != req.body.staff?.basicDetails.email) {
        const userExists = await Staff.findOne({
          'basicDetails.email': req.body.staff?.basicDetails.email});
        if (userExists&&req.body.staff?.basicDetails.email) {
          return sendStandardResponse(res, 'CONFLICT', {
            error: 'Email already exists',
            message: 'A staff with this email already exists.',
          });
        }
        const userExists1 = await Worker.findOne({
          'basicDetails.email': req.body.staff?.basicDetails.email});
        if (userExists1 &&req.body.staff?.basicDetails.email) {
          return sendStandardResponse(res, 'CONFLICT', {
            error: 'Email already exists',
            message: 'A Worker with this email already exists.',
          });
        }
      }
      const newStaff = await Staff.findByIdAndUpdate(
        req.params.staffId,
        req.body.staff,
        {new: true},
      );
      // file upload
      if (req.file && newStaff && previousStaff) {
        console.log('new profile pic updating....');
        await GoogleDrive.uploadFile({
          name: `${req.body.staff.basicDetails.firstName} ${req.body.staff.basicDetails?.middleName ?? ''} ${req.body.staff.basicDetails.lastName} - ${newStaff._id}`,
          body: fs.createReadStream(req.file.path),
          mimeType: req.file.mimetype,
          makePublic: true,
          parents: [FilePath.Profile_Pic],
        })
          .then((fileID) => {
            // console.log({ result });
            if (fileID && newStaff) {
              if (previousStaff.imageURL) {
                const removedFrontPart = previousStaff.imageURL?.substr(
                  31,
                ) as string;
                const existingFileId = removedFrontPart.substr(
                  0,
                  removedFrontPart?.length - 16,
                );

                GoogleDrive.deleteFile(existingFileId).catch((error) => {
                  // sendStandardResponse(res, 'INTERNAL SERVER ERROR', {
                  //   error: ' File not found',
                  //   message: 'Something went wrong! Please try again',
                  // });
                  console.log(error);
                });
              }
              newStaff.imageURL = `https://drive.google.com/thumbnail?id=${fileID}&export=download`;
              // console.log(staff);
              newStaff.save();
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
      if (!previousStaff || !newStaff) {
        return next(new Error('Staff ID Not found'));
      }

      sendStandardResponse(res, 'OK', {
        data: newStaff,
        message: 'Successfully updated staff',
      });
      console.log('---------success--------------');
      staffEvents.emit('update', {data: {previousStaff, newStaff}});
    } catch (error) {
      next(error);
    }
  },
);

// 🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥

/**
 * For deleting a staff (Actually it's just updating the user status to 'deleted')
 * [DELETED] /hr/staff/{staff id}
 *
 * @author <jishnu@computervalley.online>, <@jishnu-cv>
 *
 * ✍🏻
 */
staffsRouter.delete('/:staffId',
  authCheck(['READ_ACCESS']),
  async (req, res, next) => {
    try {
      // eslint-disable-next-line no-constant-condition
      if (false) {
        // TODO: Prevent any user from deleting himself
        next(new Error('A user cannot delete himself!'));
      }
      const staff = await Staff.findOneAndUpdate(
        {_id: req.params.staffId},
        {status: StaffLifeCycleStates.DELETED},
        {new: true},
      );
      // Update email property if it exists

      const emailToUpdate = staff?.basicDetails?.email;

      if (emailToUpdate !== undefined) {
        staff!.basicDetails!.email = emailToUpdate + '.deleted';
        await staff!.save();
      } else {
        console.log('Staff object or email property not found.');
      }

      if (!staff) {
        return next(new Error('Staff ID Not found'));
      }
      sendStandardResponse(res, 'OK', {
        data: staff,
        message: 'Successfully deleted staff',
      });
      staffEvents.emit('delete', {data: staff});
    } catch (error) {
      next(error);
    }
  },
);

// 🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥

/**
 * For deleting a staff (Actually it's just updating the user status to 'deleted')
 * [DELETED] /hr/staff/{staff id}
 *
 * @author <jishnu@computervalley.online>, <@jishnu-cv>
 *
 * ✍🏻
 */

staffsRouter.delete(
  '/:staffId/force',
  authCheck(['READ_ACCESS']),
  async (req, res, next) => {
    try {
      // eslint-disable-next-line no-constant-condition
      if (false) {
        // TODO: Prevent any user from deleting himself
        next(new Error('A user cannot delete himself!'));
      }
      const staff = await Staff.findOneAndDelete({_id: req.params.staffId});
      if (!staff) {
        return next(new Error('Staff ID Not found'));
      }
      sendStandardResponse(res, 'OK', {
        data: staff,
        message: 'Successfully force deleted staff',
      });
      // staffEvents.emit('forceDelete', {data: staff});
    } catch (error) {
      next(error);
    }
  },
);


// 🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥
export default staffsRouter;
