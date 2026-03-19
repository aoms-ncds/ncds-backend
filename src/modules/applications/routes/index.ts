/* eslint-disable max-len */
import {Router} from 'express';
import {MongoError} from 'mongodb';
import authCheck from '../../../extras/auth_check';
import Application, {IApplication} from '../models/Application';
import {sendStandardResponse} from '../../../extras/helpers';
import applicationsEvents from '../events/application_events';
import CommonLifeCycleStates from '../../../extras/CommonLifeCycleStates';
import {FormattedCode} from '../../../models/FormattedCode';
import {FilterQuery} from 'mongoose';
import ApplicationLifeCycleStates from '../extras/ApplicationLifeCycleStates';
import Mailer from '../../../extras/Mailer';
import esignature from '../../settings/models/esignature';
import moment from 'moment';
import Division from '../../divisions/models/Division';
interface DateRange {
  startDate: Moment;
  endDate: Moment;
}
const applicationsRouter = Router();

/**
 * For getting count of all application
 * [GET] /application/
 * [GET] /application?status=0 - For getting list of all inactive application
 * [GET] /application?status=1 - For getting list of all active application
 * [GET] /application?status=-1 - For getting list of all deleted application
 *
 * @author <johnsjkottaram@gmail.com>, <@johnsjkottaram>
 *
 */
applicationsRouter.get('/count', authCheck(['READ_APPLICATION']), async (req, res, next) => {
  try {
    const conditions: FilterQuery<IApplication> = {};
    // conditions.status = FRLifeCycleStates.WAITING_FOR_ACCOUNTS;
    if (Object.keys(req.query).includes('status')) {
      conditions.status = Number(req.query.status);
    }
    // if (res.locals.authUser.kind=='worker') {
    //   conditions.division = res.locals.authUser.division;
    // }
    sendStandardResponse<number>(res, 'OK', {
      data: await Application.countDocuments(conditions),
      message: 'Successfully fetched list of Application',
    });
  } catch (error) {
    next(error);
  }
});
applicationsRouter.get('/countBydiv', authCheck(['READ_APPLICATION']), async (req, res, next) => {
  try {
    const conditions: FilterQuery<IApplication> = {};
    // conditions.status = FRLifeCycleStates.WAITING_FOR_ACCOUNTS;
    if (Object.keys(req.query).includes('status')) {
      conditions.status = Number(req.query.status);
    }
    // if (res.locals.authUser.kind=='worker') {
    conditions.division = res.locals.authUser.division;
    // }
    sendStandardResponse<number>(res, 'OK', {
      data: await Application.countDocuments(conditions),
      message: 'Successfully fetched list of Application',
    });
  } catch (error) {
    next(error);
  }
});
applicationsRouter.get(
  '/',
  authCheck(['READ_APPLICATION']),
  async (req, res, next) => {
    try {
      let conditions: FilterQuery<IApplication> = {};
      if (Object.keys(req.query).includes('dateRange')) {
        conditions = {
          ...conditions,
          createdAt: {
            $gt: moment.utc((req.query?.dateRange as unknown as DateRange)?.startDate).startOf('D').toDate(),
            $lt: moment.utc((req.query?.dateRange as unknown as DateRange)?.endDate).endOf('D').toDate(),
          },
        };
      }
      if (Object.keys(req.query).includes('status')) {
        conditions.status = Number(req.query.status);
      }
      if (Object.keys(req.query).includes('statusFilter')) {
        if (Number(req.query.statusFilter) === 70) {
          conditions.presidentSanction=true;
        } else {
          conditions.status = Number(req.query.statusFilter);
        }
      }
      if (res.locals.authUser.kind == 'worker') {
        conditions.division = res.locals.authUser.division;
      }
      sendStandardResponse<IApplication[]>(res, 'OK', {
        data: await Application.find(conditions)
          .populate('attachment').populate('division')
          .populate('createdBy')
          .populate('coordinatorName')
          .sort({updatedAt: 'desc'}),
        message: 'Successfully fetched list of application',
      });
    } catch (error) {
      next(error);
    }
  },
);
/* For adding Application*/
applicationsRouter.post(
  '/',
  authCheck(['WRITE_APPLICATION']),
  async (req, res, next) => {
    try {
      console.log(req.body, '900');
      const divs= await Division.findById(res.locals.authUser.division);
      const eSign= await esignature.find({});

      const application = new Application({
        ...req.body,
        createdBy: res.locals.authUser._id,
        appliedFor: req.body.appliedFor,
        name: req.body.name,
        // approvedDate: new Date(),
        coordinatorName: divs?.details.coordinator?.name,
        presidentName: eSign[0].presidentName,
        presidentSignature: eSign[0].presidentSignature,
        status: CommonLifeCycleStates.CREATED,
        division: res.locals.authUser.division,
        applicationCode:
        'APN' +
        (
          await FormattedCode.findOneAndUpdate(
            {},
            {$inc: {applicationCode: 1}},
            {new: true},
          )
        )?.applicationCode.toString().padStart(4, '0'),
      });

      await application.validate();
      await application.save();
      sendStandardResponse(res, 'OK', {
        data: await (await (
          await application.populate('attachment')
        ).populate('createdBy')).populate('division'),
        message: 'Successfully added new Application',
      });
      applicationsEvents.emit('create', {data: application});
    } catch (error) {
      if (error instanceof MongoError && error.code === 11000) {
        return sendStandardResponse(res, 'CONFLICT', {
          error: 'Duplicate entry error',
          message: 'Another Application with the same name already exists!',
        });
      }

      next(error);
    }
  },
);
applicationsRouter.post(
  '/sentToPresident',
  authCheck(['WRITE_APPLICATION']),
  async (req, res, next) => {
    try {
      const divs= await Division.findById(res.locals.authUser.division);
      const eSign= await esignature.find({});
      console.log(req.body.application, '900');

      const application :IApplication = new Application({
        ...req.body,
        appliedFor: req.body.appliedFor,
        name: req.body.name,
        coordinatorName: divs?.details.coordinator?.name,
        presidentName: eSign[0].presidentName,
        presidentSignature: eSign[0].presidentSignature,
        // approvedDate: new Date(),
        createdBy: res.locals.authUser._id,
        status: ApplicationLifeCycleStates.SENT_TO_PRESIDENT,
        division: res.locals.authUser.division,
        presidentSanction: false,
        applicationCode:
        'APN' +
        (
          await FormattedCode.findOneAndUpdate(
            {},
            {$inc: {applicationCode: 1}},
            {new: true},
          )
        )?.applicationCode.toString().padStart(4, '0'),
      });

      await application.validate();
      await application.save();
      sendStandardResponse(res, 'OK', {
        data: await (await (
          await application.populate('attachment')
        ).populate('createdBy')).populate('division'),
        message: 'Successfully added new Application',
      });
      applicationsEvents.emit('create', {data: application});
      applicationsEvents.emit('active', {
        data: application,
      });
      console.log(application, 'application');
      const prSign= await esignature.find();
      console.log(prSign[0].presidentEmail, 'signn');

      await Mailer.sendMail({
        to: prSign[0].presidentEmail,
        from: `AOMS <${process.env.EMAIL}>`,
        subject: `An Application Awaiting President Approval From ${application.division?.details?.name || ''}.`,
        html: `Dear Sir,<br/><br/>
               Application No. ${application?.applicationCode} from ${application.createdBy?.basicDetails?.firstName || ''} ${application.createdBy?.basicDetails?.middleName || ''} ${application.createdBy?.basicDetails?.lastName || ''}, ${application.division?.details?.name}, is awaiting your approval in the ERP system. Kindly review the application and take the necessary action at your earliest convenience.<br/><br/> 
               Thank you for your prompt attention to this matter.
`,
      });
    } catch (error) {
      if (error instanceof MongoError && error.code === 11000) {
        return sendStandardResponse(res, 'CONFLICT', {
          error: 'Duplicate entry error',
          message: 'Another Application with the same name already exists!',
        });
      }

      next(error);
    }
  },
);

/* For getting a specific Application by id */

applicationsRouter.get(
  '/:applicationId',
  authCheck(['READ_APPLICATION']),
  async (req, res, next) => {
    try {
      sendStandardResponse<IApplication | null>(res, 'OK', {
        data: await Application.findById(req.params.applicationId)
          .populate('attachment')
          .populate('createdBy')
          .populate('presidentSignature')
          .populate('coordinatorName')
          .populate('division')
          .populate('workersName'),
        message: 'Successfully fetched Application',
      });
    } catch (error) {
      next(error);
    }
  },
);

/* For updating a Application  */

applicationsRouter.patch(
  '/:applicationId',
  authCheck(['WRITE_APPLICATION']),
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
      const previousApplication = await Application.findById(
        req.params.applicationId,
      );
      const newApplication = await Application.findByIdAndUpdate(
        req.params.applicationId,
        {
          ...req.body, // Spread req.body first
          appliedFor: req.body.appliedFor, // Override appliedFor
          name: req.body.name, // Override name
        },
        {new: true}, // Options should be in a separate object
      );

      if (!previousApplication || !newApplication) {
        return next(new Error('Application ID Not found'));
      }

      sendStandardResponse(res, 'OK', {
        data: newApplication,
        message: 'Successfully updated Application',
      });
      applicationsEvents.emit('update', {
        data: {
          previousApplication,
          newApplication,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);
applicationsRouter.patch(
  '/remark/:applicationId',
  authCheck(['WRITE_APPLICATION']),
  async (req, res, next) => {
    console.log(req.body, '900');
    console.log( req.params, '9001');
    try {
      const newApplication = await Application.findByIdAndUpdate(
        req.params.applicationId,
        {remark: req.body.remark},
        {new: true},
      );
      if (!newApplication) {
        return next(new Error('Application ID Not found'));
      }

      sendStandardResponse(res, 'OK', {
        data: newApplication,
        message: 'Successfully Added Remark',
      });
    } catch (error) {
      next(error);
    }
  },
);

// For Status change Approve
applicationsRouter.patch(
  '/:applicationId/:operation',
  (authCheck(['READ_APPLICATION'] ) ),
  async (req, res, next) => {
    try {
      console.log(res.locals.authUser.permissions.PRESIDENT_ACCESS, '98');
      if (!['approve', 'reject', 'active', 'delete'].includes(req.params.operation)) {
        next(
          new Error(
            'Only approve/reject operations are allowed by this API endpoint!',
          ),
        );
      }
      const applications = await Application.findByIdAndUpdate(
        req.params.applicationId,
        {
          reasonForDeactivation: req.body.reason,
          status:
            req.params.operation === 'approve' ?
              CommonLifeCycleStates.APPROVED :
              req.params.operation === 'reject' ?
                CommonLifeCycleStates.REJECTED :
                req.params.operation === 'active' ?
                  ApplicationLifeCycleStates.SENT_TO_PRESIDENT :
                  null,
        },
        {new: true},
      );

      if (req.params.operation === 'delete') {
        await Application.deleteOne({_id: req.params.applicationId});
      }
      if (!applications) {
        return next(new Error('Application ID Not found'));
      }

      sendStandardResponse(res, 'OK', {
        data: applications,
        message: `Successfully ${
          req.params.operation === 'approve' ?
            'approved' :
            req.params.operation === 'delete' ?
              'Deleted' :
              req.params.operation === 'active' ?
                'activated' :
                'rejected'
        } Application`,
      });
      if (res.locals.authUser.permissions.PRESIDENT_ACCESS ==true && req.params.operation === 'approve' ) {
        await Application.findByIdAndUpdate(
          req.params.applicationId,
          {
            presidentSanction: true,
            letterNumber: `${new Date()}/IET/${applications.applicationCode}`,
          },
          {new: true},
        );
      }
      console.log(req.params.operation, 'req.params.operation');
      if (req.params.operation === 'approve') {
        await Application.updateOne(
          {_id: req.params.applicationId}, // Find the document by ID
          {$set: {approvedDate: new Date()}}, // Adds `approvedDate` if it doesn't exist
          {upsert: false}, // Ensures it only updates existing documents
        );
      }


      if (req.params.operation==='active') {
        applicationsEvents.emit('active', {
          data: applications,
        });
      } else
        if (req.params.operation==='approve') {
          applicationsEvents.emit('approve', {
            data: applications,
          });
        } else {
          console.log('no action');
        }
    } catch (error) {
      next(error);
    }
  },
);

/* For Deleting a Application  */

applicationsRouter.delete(
  '/:applicationId',
  authCheck(['READ_ACCESS']),
  async (req, res, next) => {
    try {
      const application = await Application.findOneAndUpdate(
        {_id: req.params.applicationId},
        {status: -1},
        {new: true},
      );
      if (!application) {
        return next(new Error('Application ID Not found'));
      }
      sendStandardResponse(res, 'OK', {
        data: application,
        message: 'Successfully deleted application',
      });
      applicationsEvents.emit('delete', {data: application});
    } catch (error) {
      next(error);
    }
  },
);

export default applicationsRouter;
