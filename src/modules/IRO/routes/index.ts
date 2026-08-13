/* eslint-disable max-len */
/* eslint-disable no-unused-vars */
import {Router} from 'express';
import authCheck from '../../../extras/auth_check';
import {sendStandardResponse} from '../../../extras/helpers';
import IROLifeCycleStates from '../extras/IROLifeCycleStates';
import IRO, {IROrder} from '../models/IRO';
import mongoose, {FilterQuery} from 'mongoose';
import {IRemark} from '../../FR/models/remarks';
import iroRemarks from '../models/iroRemarks';
import {FileObject, IFile} from '../../fileUploader/models/Files';
import IROEvents from '../events/IRO_events';
import ReleaseAmount, {IReleaseAmount} from '../models/ReleaseAmount';
import FR from '../../FR/models/FR';
import User from '../../users/models/User';
import {IUser} from '../../users/extras/user_types';
import MessagingService from '../../../extras/Messaging';
import Message from '../../../models/Messages';

import FRLifeCycleStates from '../../FR/extras/FRLifeCycleStates';
import esignature from '../../settings/models/esignature';
import remarkEvents from '../events/remarks_event';
import {Counts} from '../../../models/Counts';
import TransactionLog, {ITransactionLog} from '../../FR/models/transactionLog';
import {Moment} from 'moment';
import moment from 'moment';
import GroupedIRO from '../models/groupIRO';
import {ObjectId} from 'mongodb';
import Mailer from '../../../extras/Mailer';
import {FormattedCode} from '../../../models/FormattedCode';
import Division from '../../divisions/models/Division';
import FREvents from '../../FR/events/FR_events';
import CustomFR from '../../FR/models/CustomFR';
import CustomIRO from '../models/CustomIRO';
import Particulars from '../../FR/models/particulars';
import PaymentMethod from '../../settings/models/paymentMethod';
import GroupedIROView from '../models/groupedIROView';
import Designation from '../../settings/models/designation';
// import users from '../../users/models/User';
const IRORouter = Router();
/**
 * For getting a count of all IRO+
 * [GET] /iro/count
 * [GET] /iro/count?status=0 - For getting list of all inactive IRO
 * [GET] /iro/count?status=1 - For getting list of all active IRO
 * [GET] /iro/count?status=-1 - For getting list of all deleted IRO
 *
 * @author <annmariya@computervalley.online>, <@annmariyacomputervalley>
 *
 * 📘
 */
interface DateRange {
  startDate: Moment;
  endDate: Moment;
}

IRORouter.get('/count', authCheck(['READ_ACCESS']), async (req, res, next) => {
  try {
    const conditions: Partial<IROrder> = {};
    // conditions.status = IROLifeCycleStates.WAITING_FOR_ACCOUNTS_MNGR;
    if (Object.keys(req.query).includes('status')) {
      conditions.status = Number(req.query.status);
    }
    if (Object.keys(req.query).includes('day')) {
      conditions.status = Number(req.query.status);
    }
    if (res.locals.authUser.kind == 'worker') {
      conditions.division = res.locals.authUser.division;
    }
    if (Object.keys(req.query).includes('year')) {
      const year = String(req.query.year); // "2025-26"

      const [startYear, endYear] = year.split('-');

      const startDate = new Date(`${startYear}-04-01T00:00:00.000Z`);
      const endDate = new Date(`20${endYear}-03-31T23:59:59.999Z`);

      conditions.createdAt = {
        $gte: startDate,
        $lte: endDate,
      };
    }
    sendStandardResponse<number>(res, 'OK', {
      data: await IRO.countDocuments(conditions),
      message: 'Successfully fetched list of IRO',
    });
  } catch (error) {
    next(error);
  }
});
IRORouter.get('/countDay', authCheck(['READ_ACCESS']), async (req, res, next) => {
  try {
    const conditions: any = {};

    // filter by status
    if (req.query.status) {
      conditions.status = Number(req.query.status);
    }

    // overdue logic
    if (req.query.day) {
      const days = Number(req.query.day);

      const overdueDate = new Date();
      overdueDate.setDate(overdueDate.getDate() - days);

      conditions.createdAt = {$lte: overdueDate};
    }
    if (Object.keys(req.query).includes('year')) {
      const year = String(req.query.year); // "2025-26"

      const [startYear, endYear] = year.split('-');

      const startDate = new Date(`${startYear}-04-01T00:00:00.000Z`);
      const endDate = new Date(`20${endYear}-03-31T23:59:59.999Z`);

      conditions.createdAt = {
        $gte: startDate,
        $lte: endDate,
      };
    }

    // worker restriction
    if (res.locals.authUser.kind === 'worker') {
      conditions.division = res.locals.authUser.division;
    }

    const count = await IRO.countDocuments(conditions);

    sendStandardResponse<number>(res, 'OK', {
      data: count,
      message: 'Successfully fetched overdue IRO count',
    });
  } catch (error) {
    next(error);
  }
});
IRORouter.get('/totalAmount', authCheck(['READ_ACCESS']), async (req, res, next) => {
  try {
    const conditions: any = {};
    console.log(req.query, 'req.query');
    if (req.query.year) {
      const year = String(req.query.year); // "2025-26"

      const [startYear, endYear] = year.split('-');

      const startDate = new Date(`${startYear}-04-01T00:00:00.000Z`);
      const endDate = new Date(`20${endYear}-03-31T23:59:59.999Z`);

      conditions.createdAt = {
        $gte: startDate,
        $lte: endDate,
      };
    }
    // filter by status
    if (req.query.status) {
      conditions.status = Number(req.query.status);
    }

    // overdue logic
    if (req.query.day) {
      const days = Number(req.query.day);

      const overdueDate = new Date();
      overdueDate.setDate(overdueDate.getDate() - days);

      conditions.createdAt = {$lte: overdueDate};
    }

    // worker restriction
    if (res.locals.authUser.kind === 'worker') {
      conditions.division = res.locals.authUser.division;
    }
    if (req.query.total === 'sanctioned') {
      conditions.status = IROLifeCycleStates.WAITING_FOR_ACCOUNTS_STATE;
    }
    if (req.query.total === 'transferred') {
      conditions.status = IROLifeCycleStates.WAITING_FOR_RELEASE_AMOUNT;
    }

    const iros = await IRO.find(conditions).populate('particulars').populate('releaseAmount');

    let totalSanctionedAmount = 0;
    let totalTranfferedAmount = 0;

    if (req.query.total === 'sanctioned') {
      iros.forEach((iro: any) => {
        if (Array.isArray(iro.particulars)) {
          iro.particulars.forEach((item: any) => {
            totalSanctionedAmount += Number(item.sanctionedAmount) || 0;
          });
        }
      });
    }

    if (req.query.total === 'transferred') {
      iros.forEach((iro: any) => {
        totalTranfferedAmount += Number(iro?.releaseAmount?.transferredAmount) || 0;
      });
    }
    if (req.query.total === 'reconciliation') {
      iros.forEach((iro: any) => {
        totalTranfferedAmount += Number(iro?.releaseAmount?.transferredAmount) || 0;
      });
    }


    sendStandardResponse(res, 'OK', {
      data: {
        totalSanctionedAmount,
        totalTranfferedAmount,
      }, message: 'Successfully fetched total sanctioned amount',
    });
  } catch (error) {
    next(error);
  }
});
IRORouter.get('/appliedCount', authCheck(['READ_ACCESS']), async (req, res, next) => {
  try {
    const conditions: any = {};
    console.log(res.locals.authUser, 'oioi');

    if (Object.keys(req.query).includes('year')) {
      const year = String(req.query.year); // e.g. 2025-26
      const [startYear, endYear] = year.split('-');

      const startDate = new Date(`${startYear}-04-01T00:00:00.000Z`);
      const endDate = new Date(`20${endYear}-03-31T23:59:59.999Z`);

      conditions.createdAt = {
        $gte: startDate,
        $lte: endDate,
      };
    }
    if (res.locals.authUser.permissions.ADMIN_ACCESS === true) {
      conditions;
    } else if (res.locals.authUser.kind === 'worker' ||res.locals.authUser.kind === 'staff') {
      conditions.division = res.locals.authUser.division;
    } else {
      conditions.division = res.locals.authUser.division;
    }
    sendStandardResponse<number |null>(res, 'OK', {
      data: await IRO.countDocuments(conditions),
      message: 'Successfully fetched IRO count',
    });
  } catch (error) {
    next(error);
  }
});
IRORouter.get(
  '/appliedCount/:divisionID',
  authCheck(['READ_ACCESS']),
  async (req, res, next) => {
    try {
      const {divisionID} = req.params;
      if (!divisionID) {
        return sendStandardResponse<number>(res, 'BAD REQUEST', {
          data: 0,
          message: 'Division ID is required',
        });
      }

      const count = await IRO.countDocuments({
        division: divisionID,
      });

      sendStandardResponse<number>(res, 'OK', {
        data: count,
        message: 'Successfully fetched divisions IRO count',
      });
    } catch (error) {
      next(error);
    }
  },
);

IRORouter.get('/groupedIRO', authCheck(['READ_ACCESS']), async (req, res, next) => {
  try {
    console.log(req.query.Exstatus, 'req.query33');
    const paymentMethods = await PaymentMethod.find({});
    // if (req.query.dateRange) {
    //   const dateRange = req.query.dateRange as unknown as DateRange;
    //   conditions['IRO.IRODate'] = {
    //     $gte: moment.utc(dateRange.startDate).startOf('day').toDate(),
    //     $lt: moment.utc(dateRange.endDate).endOf('day').toDate(),
    //   };
    // }
    console.log(req.query, 'req.query');

    // if (req.query.Exstatus) {
    //   conditions['IRO.sanctionedBank'] = paymentMethods.map((e) => e.paymentMethod);
    // }
    let conditions: FilterQuery<IROrder> = {
      ...(req.query.Exstatus && {sanctionedBank: paymentMethods.map((e) => e.paymentMethod)}),
    };
    if (req.query.support) {
      if (req.query.support === 'Expanse') {
        conditions = {
          ...conditions,
          $and: [
            {
              $or: [
                {workerSupport: {$exists: false}}, // Field does not exist
                {workerSupport: false}, // Explicitly false
              ],
            },
            {
              $or: [
                {childSupport: {$exists: false}}, // Field does not exist
                {childSupport: false}, // Explicitly false
              ],
            },
          ],
        };
      } else if (req.query.support === 'Support') {
        conditions = {
          ...conditions,
          $or: [{workerSupport: true}, {childSupport: true}],
        };
      }
    }
    if (req.query.dateRange) {
      conditions.IRODate = {
        $gte: moment.utc((req.query.dateRange as unknown as DateRange).startDate).startOf('day').toDate(),
        $lt: moment.utc((req.query.dateRange as unknown as DateRange).endDate).endOf('day').toDate(),
      };
    }

    console.log(conditions, 'conditions88');

    sendStandardResponse<IROrder[] |null>(res, 'OK', {
      data: await GroupedIRO.find().populate({
        path: 'IRO', // Populate the IRO field
        match: conditions, // Apply filter to IRO documents
        populate: [
          {path: 'division'}, // Populate the division field inside IRO
          {path: 'releaseAmount'}, // Populate the releaseAmount field inside IRO
          {path: 'particulars'}, // Populate the releaseAmount field inside IRO
          {path: 'particulars'}, // Populate the releaseAmount field inside IRO
          {path: 'purposeSubdivision'}, // Populate the releaseAmount field inside IRO
        ],
      }),
      // .populate('IRO').populate('IRO.releaseAmount').populate('IRO.division'),
      message: 'Successfully fetched IRO ',
    });
  } catch (error) {
    next(error);
  }
});
IRORouter.get('/groupedIROView', authCheck(['READ_ACCESS']), async (req, res, next) => {
  try {
    console.log(req.query.Exstatus, 'req.query33');
    const paymentMethods = await PaymentMethod.find({});
    // if (req.query.dateRange) {
    //   const dateRange = req.query.dateRange as unknown as DateRange;
    //   conditions['IRO.IRODate'] = {
    //     $gte: moment.utc(dateRange.startDate).startOf('day').toDate(),
    //     $lt: moment.utc(dateRange.endDate).endOf('day').toDate(),
    //   };
    // }
    console.log(req.query, 'req.query');

    // if (req.query.Exstatus) {
    //   conditions['IRO.sanctionedBank'] = paymentMethods.map((e) => e.paymentMethod);
    // }
    let conditions: FilterQuery<IROrder> = {
      ...(req.query.Exstatus && {sanctionedBank: paymentMethods.map((e) => e.paymentMethod)}),
      ...(req.query.Exstatus && (req.query.Exstatus as any)?.[0] == 71 && {sanctionedBank: {$nin: paymentMethods.map((e) => e.paymentMethod)}}),
    };
    if (req.query.support) {
      if (req.query.support === 'Expanse') {
        conditions = {
          ...conditions,
          $and: [
            {
              $or: [
                {workerSupport: {$exists: false}}, // Field does not exist
                {workerSupport: false}, // Explicitly false
              ],
            },
            {
              $or: [
                {childSupport: {$exists: false}}, // Field does not exist
                {childSupport: false}, // Explicitly false
              ],
            },
          ],
        };
      } else if (req.query.support === 'Support') {
        conditions = {
          ...conditions,
          $or: [{workerSupport: true}, {childSupport: true}],
        };
      }
    }
    if (req.query.dateRange) {
      conditions.IRODate = {
        $gte: moment.utc((req.query.dateRange as unknown as DateRange).startDate).startOf('day').toDate(),
        $lt: moment.utc((req.query.dateRange as unknown as DateRange).endDate).endOf('day').toDate(),
      };
    }

    console.log(conditions, 'conditions88');

    sendStandardResponse<IROrder[] |null>(res, 'OK', {
      data: await GroupedIROView.find().populate({
        path: 'IRO', // Populate the IRO field
        match: conditions, // Apply filter to IRO documents
        populate: [
          {path: 'division'}, // Populate the division field inside IRO
          {path: 'releaseAmount'}, // Populate the releaseAmount field inside IRO
          {path: 'particulars'}, // Populate the releaseAmount field inside IRO
          {path: 'particulars'}, // Populate the releaseAmount field inside IRO
          {path: 'purposeSubdivision'}, // Populate the releaseAmount field inside IRO
        ],
      }),
      // .populate('IRO').populate('IRO.releaseAmount').populate('IRO.division'),
      message: 'Successfully fetched IRO ',
    });
  } catch (error) {
    next(error);
  }
});

IRORouter.get(
  '/count/close',
  authCheck(['READ_IRO']),
  async (req, res, next) => {
    try {
      const conditions: Partial<IROrder> = {};
      conditions.status = IROLifeCycleStates.IRO_CLOSED;
      if (Object.keys(req.query).includes('status')) {
        conditions.status = Number(req.query.status);
      }
      if (res.locals.authUser.kind == 'worker') {
        conditions.division = res.locals.authUser.division;
      }

      sendStandardResponse<number>(res, 'OK', {
        data: await IRO.countDocuments(conditions),
        message: 'Successfully fetched list of IRO',
      });
    } catch (error) {
      next(error);
    }
  },
);
IRORouter.get(
  '/count/reconciliation',
  authCheck(['READ_IRO']),
  async (req, res, next) => {
    try {
      const conditions: Partial<IROrder> = {};
      conditions.status = IROLifeCycleStates.RECONCILIATION_DONE;
      if (Object.keys(req.query).includes('status')) {
        conditions.status = Number(req.query.status);
      }
      if (res.locals.authUser.kind == 'worker') {
        conditions.division = res.locals.authUser.division;
      }
      sendStandardResponse<number>(res, 'OK', {
        data: await IRO.countDocuments(conditions),
        message: 'Successfully fetched list of Reconciliation',
      });
    } catch (error) {
      next(error);
    }
  },
);
/*
 * For getting a list of all IRO
 * [GET] /iro/
 *
 * @author <annmariya@computervalley.online>, <@annmariya>
 *
 * 📘
 */
IRORouter.get('/', authCheck(['READ_IRO']), async (req, res, next) => {
  try {
    let conditions: FilterQuery<IROrder> = {
    };
    // console.log(req.query.status?.[0], 'req.query.status');

    const paymentMethods = await PaymentMethod.find({});
    console.log(req.query.ExStatus, 'req.query.status');

    // if ((req.query.Exstatus as any)?.[0] == 69) {
    //   conditions.sanctionedBank = paymentMethods.map((e)=>e.paymentMethod);
    //   conditions.status = (req.query.status);
    // }
    if (Object.keys(req.query).includes('status')) {
      conditions.status = (req.query.status);
    }
    if (res.locals.authUser.kind == 'worker') {
      conditions.division = res.locals.authUser.division;
    }
    if (Object.keys(req.query).includes('sourceOfAccount')) {
      conditions.sourceOfAccount = (req.query.sourceOfAccount);
    }
    console.log(conditions, 'req.query?.dateRange');

    // conditions.status=IROLifeCycleStates.WAITTING_FOR_RELEASE_AMOUNT;
    console.log(req.query, 'req.query.sourceOfAccount');
    if (Object.keys(req.query).includes('dateRange')) {
      conditions = {
        ...conditions,
        IRODate: {
          $gte: moment.utc((req.query?.dateRange as unknown as DateRange)?.startDate).startOf('day').toDate(),
          $lt: moment.utc((req.query?.dateRange as unknown as DateRange)?.endDate).endOf('day').toDate(),
        },
        ...(req.query.Exstatus && {sanctionedBank: paymentMethods.map((e) => e.paymentMethod)}),
      };
    }
    console.log(conditions, 'conditions77');
    sendStandardResponse<IROrder[]>(res, 'OK', {
      data: await IRO.find(conditions)
        .populate('releaseAmount')
        .populate('particulars')
        .populate('revertedBy')
        .populate({
          path: 'FR',
          populate: [
            {path: 'frd', model: 'frdModel'}, // Populating 'frd' inside 'FR'
            {
              path: 'signature',
              populate: [
                {path: 'coordinator', model: 'files'},
                {path: 'jrLeader', model: 'files'},
                {path: 'srLeader', model: 'files'},
                {path: 'president', model: 'files'},
                {path: 'officeMgr', model: 'files'},
              ],
            },
            {
              path: 'names',
              populate: [
                {path: 'coordinator', model: 'users'},
                {path: 'jrLeader', model: 'users'},
                {path: 'srLeader', model: 'users'},

              ],
            },
            {path: 'particulars', model: 'particulars'},
          ],
        })

        .populate('particulars')
        .populate('purposeSubdivision')
        .populate('division')
        .populate('purposeCoordinator')
        .populate('billAttachment')
        .populate('purposeWorker')
        .populate('signature.accountManagerSignature')
        .populate('signature.accountantSignature')
        .populate('signature.hrSignature')
        .populate('signature.officeManagerSignature')
        .populate({
          path: 'division',
          populate: {
            path: 'details.president.sign',
            model: 'files',
          },
        })
        .populate({
          path: 'division',
          populate: {
            path: 'details.president.name',
            model: 'users',
          },
        })
        .populate('approvedBy')
        .populate('createdBy')
        .populate({
          path: 'division',
          populate: {
            path: 'details.coordinator.sign',
            model: 'files',
          },
        })
        // .populate({
        //   path: 'division',
        //   populate: {
        //     path: 'details',
        //     populate: {
        //       path: 'seniorLeader.sign',
        //       model: 'files',
        //     },
        //   },
        // })
        // .populate({
        //   path: 'division',
        //   populate: {
        //     path: 'details',
        //     populate: {
        //       path: 'juniorLeader.sign',
        //       model: 'files',
        //     },
        //   },
        // })
        .populate({
          path: 'division',
          populate: {
            path: 'details',
            populate: {
              path: 'coordinator.name',
              model: 'users',
            },
          },
        })
        .sort({IRODate: 'desc'}),

      message: 'Successfully fetched list of IROs',
    });
  } catch (error) {
    next(error);
  }
});

IRORouter.get('/optimized', authCheck(['READ_IRO']), async (req, res, next) => {
  try {
    let conditions: FilterQuery<IROrder> = {
    };
    // console.log(req.query.status?.[0], 'req.query.status');

    const paymentMethods = await PaymentMethod.find({});
    // console.log(req.query?.ExStatus, );

    if ((req.query.Exstatus as any)?.[0] == 70) {
      conditions.isCustom = true;
    }
    if (Object.keys(req.query).includes('status')) {
      conditions.status = (req.query.status);
    }
    if (res.locals.authUser.kind == 'worker') {
      conditions.division = res.locals.authUser.division;
    }
    if (Object.keys(req.query).includes('sourceOfAccount')) {
      conditions.sourceOfAccount = (req.query.sourceOfAccount);
    }
    console.log(conditions, 'req.query?.dateRange');

    // conditions.status=IROLifeCycleStates.WAITTING_FOR_RELEASE_AMOUNT;
    console.log(req.query, 'req.query.sourceOfAccount');
    if (Object.keys(req.query).includes('dateRange')) {
      conditions = {
        ...conditions,
        IRODate: {
          $gte: moment.utc((req.query?.dateRange as unknown as DateRange)?.startDate).startOf('day').toDate(),
          $lt: moment.utc((req.query?.dateRange as unknown as DateRange)?.endDate).endOf('day').toDate(),
        },
        ...(req.query.Exstatus && {sanctionedBank: paymentMethods.map((e) => e.paymentMethod)}),
        ...(req.query.Exstatus && (req.query.Exstatus as any)?.[0] == 71 && {sanctionedBank: {$nin: paymentMethods.map((e) => e.paymentMethod)}}),
      };
    }
    console.log(conditions, 'conditions77');
    sendStandardResponse<IROrder[]>(res, 'OK', {
      data: req.query.Exstatus && (req.query.Exstatus as any)?.[0] == 70 ? await CustomIRO.find(conditions) : await IRO.find(conditions)
        .populate('releaseAmount')
        .populate('particulars')
        .populate('revertedBy')
        .populate({
          path: 'FR',
          populate: [
            {path: 'frd', model: 'frdModel'}, // Populating 'frd' inside 'FR'
            // {
            //   path: 'signature',
            //   populate: [
            //     {path: 'coordinator', model: 'files', select: '-base64'},
            //     {path: 'jrLeader', model: 'files', select: '-base64'},
            //     {path: 'srLeader', model: 'files', select: '-base64'},
            //     {path: 'president', model: 'files', select: '-base64'},
            //     {path: 'officeMgr', model: 'files', select: '-base64'},
            //   ],
            // },
            // {
            //   path: 'names',
            //   populate: [
            //     {path: 'coordinator', model: 'users'},
            //     {path: 'jrLeader', model: 'users'},
            //     {path: 'srLeader', model: 'users'},
            //   ],
            // },
            {path: 'particulars', model: 'particulars'},
          ],
        })
        .populate('particulars')
        .populate('purposeSubdivision')
        .populate('division')
        .populate('purposeCoordinator')
        .populate('billAttachment')
        .populate('purposeWorker')
        .populate('signature.accountManagerSignature')
        .populate('signature.accountantSignature')
        .populate('signature.hrSignature')
        .populate({
          path: 'signature.officeManagerSignature',
          select: '-base64',
        })
        .populate({
          path: 'division',
          populate: {
            path: 'details.president.sign',
            model: 'files',
          },
        })
        .populate({
          path: 'division',
          populate: {
            path: 'details.president.name',
            model: 'users',
          },
        })
        // .populate('approvedBy')
        // .populate({select: '-createdBy'})
        .populate({
          path: 'division',
          populate: {
            path: 'details.coordinator.sign',
            model: 'files',
          },
        })
        // .populate({
        //   path: 'division',
        //   populate: {
        //     path: 'details',
        //     populate: {
        //       path: 'seniorLeader.sign',
        //       model: 'files',
        //     },
        //   },
        // })
        // .populate({
        //   path: 'division',
        //   populate: {
        //     path: 'details',
        //     populate: {
        //       path: 'juniorLeader.sign',
        //       model: 'files',
        //     },
        //   },
        // })
        .populate({
          path: 'division',
          populate: {
            path: 'details',
            populate: {
              path: 'coordinator.name',
              model: 'users',
            },
          },
        })
        .sort({IRODate: 'desc'}),

      message: 'Successfully fetched list of IROs',
    });
  } catch (error) {
    next(error);
  }
});
IRORouter.get('/optimizedEx-support', authCheck(['READ_IRO']), async (req, res, next) => {
  try {
    let conditions: FilterQuery<IROrder> = {
    };
    // console.log(req.query.status?.[0], 'req.query.status');

    const paymentMethods = await PaymentMethod.find({});
    console.log(req.query, 'req.query.status');

    // if ((req.query.Exstatus as any)?.[0] == 69) {
    //   conditions.sanctionedBank = paymentMethods.map((e)=>e.paymentMethod);
    //   conditions.status = (req.query.status);
    // }
    if (Object.keys(req.query).includes('status')) {
      conditions.status = (req.query.status);
    }
    if (res.locals.authUser.kind == 'worker') {
      conditions.division = res.locals.authUser.division;
    }
    if (Object.keys(req.query).includes('sourceOfAccount')) {
      conditions.sourceOfAccount = (req.query.sourceOfAccount);
    }
    console.log(req.query, 'req.query?.dateRange');
    if (req.query.support) {
      if (req.query.support === 'Expanse') {
        conditions = {
          ...conditions,
          $and: [
            {
              $or: [
                {workerSupport: {$exists: false}}, // Field does not exist
                {workerSupport: false}, // Explicitly false
              ],
            },
            {
              $or: [
                {childSupport: {$exists: false}}, // Field does not exist
                {childSupport: false}, // Explicitly false
              ],
            },
          ],
        };
      } else if (req.query.support === 'Support') {
        conditions = {
          ...conditions,
          $or: [{workerSupport: true}, {childSupport: true}],
        };
      } else if (req.query.support=='Custom') {
        conditions = {
          ...conditions,
          isCustom: true,
        };
      } else if (req.query.support=='Sanctioned') {
        conditions = {
          ...conditions,
          specialsanction: 'Yes',
        };
      }
    }
    // conditions.status=IROLifeCycleStates.WAITTING_FOR_RELEASE_AMOUNT;
    console.log(req.query, 'req.query.sourceOfAccount');
    if (Object.keys(req.query).includes('dateRange')) {
      conditions = {
        ...conditions,
        IRODate: {
          $gte: moment.utc((req.query?.dateRange as unknown as DateRange)?.startDate).startOf('day').toDate(),
          $lt: moment.utc((req.query?.dateRange as unknown as DateRange)?.endDate).endOf('day').toDate(),
        },
        ...(req.query.Exstatus && {sanctionedBank: paymentMethods.map((e) => e.paymentMethod)}),
      };
    }
    console.log(conditions, 'conditions77');
    sendStandardResponse<IROrder[]>(res, 'OK', {
      data: req.query.support=='Custom' ? await CustomIRO.find(conditions).sort({createdAt: 'desc'})
        .populate('particulars')
        .populate('purposeSubdivision')
        .populate('additionalSignature')
        .populate('division')
        .populate('purposeCoordinator')
        .populate('purposeWorker') : await IRO.find(conditions)
        .populate('releaseAmount')
        .populate('particulars')
        .populate({
          path: 'FR',
          populate: [
            {path: 'frd', model: 'frdModel'}, // Populating 'frd' inside 'FR'
            // {
            //   path: 'signature',
            //   populate: [
            //     {path: 'coordinator', model: 'files', select: '-base64'},
            //     {path: 'jrLeader', model: 'files', select: '-base64'},
            //     {path: 'srLeader', model: 'files', select: '-base64'},
            //     {path: 'president', model: 'files', select: '-base64'},
            //     {path: 'officeMgr', model: 'files', select: '-base64'},
            //   ],
            // },
            // {
            //   path: 'names',
            //   populate: [
            //     {path: 'coordinator', model: 'users'},
            //     {path: 'jrLeader', model: 'users'},
            //     {path: 'srLeader', model: 'users'},
            //   ],
            // },
            {path: 'particulars', model: 'particulars'},
          ],
        })
        .populate('particulars')
        .populate('purposeSubdivision')
        .populate('division')
        .populate('purposeCoordinator')
        .populate('billAttachment')
        .populate('purposeWorker')
        .populate('signature.accountManagerSignature')
        .populate('signature.accountantSignature')
        .populate('signature.hrSignature')
        .populate({
          path: 'signature.officeManagerSignature',
          select: '-base64',
        })
        .populate({
          path: 'division',
          populate: {
            path: 'details.president.sign',
            model: 'files',
          },
        })
        .populate({
          path: 'division',
          populate: {
            path: 'details.president.name',
            model: 'users',
          },
        })
        // .populate('approvedBy')
        // .populate({select: '-createdBy'})
        .populate({
          path: 'division',
          populate: {
            path: 'details.coordinator.sign',
            model: 'files',
          },
        })
        // .populate({
        //   path: 'division',
        //   populate: {
        //     path: 'details',
        //     populate: {
        //       path: 'seniorLeader.sign',
        //       model: 'files',
        //     },
        //   },
        // })
        // .populate({
        //   path: 'division',
        //   populate: {
        //     path: 'details',
        //     populate: {
        //       path: 'juniorLeader.sign',
        //       model: 'files',
        //     },
        //   },
        // })
        .populate({
          path: 'division',
          populate: {
            path: 'details',
            populate: {
              path: 'coordinator.name',
              model: 'users',
            },
          },
        })
        .sort({IRODate: 'desc'}),

      message: 'Successfully fetched list of IROs',
    });
  } catch (error) {
    next(error);
  }
});
IRORouter.get('/custom', authCheck(['READ_IRO']), async (req, res, next) => {
  try {
    let conditions: FilterQuery<IROrder> = {
    };

    if (Object.keys(req.query).includes('status')) {
      conditions.status = (req.query.status);
    }
    if (res.locals.authUser.kind == 'worker') {
      conditions.division = res.locals.authUser.division;
    }
    if (Object.keys(req.query).includes('sourceOfAccount')) {
      conditions.sourceOfAccount = (req.query.sourceOfAccount);
    }
    // conditions.status=IROLifeCycleStates.WAITTING_FOR_RELEASE_AMOUNT;
    console.log(req.query, 'req.query.sourceOfAccount');
    if (Object.keys(req.query).includes('dateRange')) {
      conditions = {
        ...conditions,
        IRODate: {
          $gt: moment.utc((req.query?.dateRange as unknown as DateRange)?.startDate).startOf('D').toDate(),
          $lt: moment.utc((req.query?.dateRange as unknown as DateRange)?.endDate).endOf('D').toDate(),
        },
      };
    }

    sendStandardResponse<any[]>(res, 'OK', {
      data: await CustomIRO.find(conditions)
        // .populate("division")
        .populate('particulars')
        .populate('purposeSubdivision')
        .populate('division')
        .populate('purposeCoordinator')
        .populate('purposeWorker')
        .populate('attachment')
        .populate('officeManagerSign')
        .populate('presidentSign')
        // .populate('signature.accountManagerSignature')
        // .populate('signature.accountantSignature')
        // .populate('signature.hrSignature')
        // .populate('signature.officeManagerSignature')
        .populate({
          path: 'division',
          populate: {
            path: 'details.president.sign',
            model: 'files',
          },
        })
        .populate({
          path: 'division',
          populate: {
            path: 'details.president.name',
            model: 'users',
          },
        })
        .populate('approvedBy')
        .populate('createdBy')
        .populate({
          path: 'division',
          populate: {
            path: 'details.coordinator.sign',
            model: 'files',
          },
        })
        // .populate({
        //   path: 'division',
        //   populate: {
        //     path: 'details',
        //     populate: {
        //       path: 'seniorLeader.sign',
        //       model: 'files',
        //     },
        //   },
        // })
        // .populate({
        //   path: 'division',
        //   populate: {
        //     path: 'details',
        //     populate: {
        //       path: 'juniorLeader.sign',
        //       model: 'files',
        //     },
        //   },
        // })
        .populate({
          path: 'division',
          populate: {
            path: 'details',
            populate: {
              path: 'coordinator.name',
              model: 'users',
            },
          },
        })
        .sort({IRODate: 'desc'}),

      message: 'Successfully fetched list of IROs',
    });
  } catch (error) {
    next(error);
  }
});
IRORouter.get('/', authCheck(['READ_IRO']), async (req, res, next) => {
  try {
    let conditions: FilterQuery<IROrder> = {
    };

    if (Object.keys(req.query).includes('status')) {
      conditions.status = (req.query.status);
    }
    if (res.locals.authUser.kind == 'worker') {
      conditions.division = res.locals.authUser.division;
    }
    if (Object.keys(req.query).includes('sourceOfAccount')) {
      conditions.sourceOfAccount = (req.query.sourceOfAccount);
    }
    // conditions.status=IROLifeCycleStates.WAITTING_FOR_RELEASE_AMOUNT;
    console.log(req.query, 'req.query.sourceOfAccount');
    if (Object.keys(req.query).includes('dateRange')) {
      conditions = {
        ...conditions,
        IRODate: {
          $gt: moment.utc((req.query?.dateRange as unknown as DateRange)?.startDate).startOf('D').toDate(),
          $lt: moment.utc((req.query?.dateRange as unknown as DateRange)?.endDate).endOf('D').toDate(),
        },
      };
    }

    sendStandardResponse<IROrder[]>(res, 'OK', {
      data: await IRO.find(conditions)
        .populate('releaseAmount')
        .populate('particulars')
        .populate('purposeSubdivision')
        .populate('division')
        .populate('purposeCoordinator')
        .populate('billAttachment')
        .populate('purposeWorker')
        .populate('signature.accountManagerSignature')
        .populate('signature.accountantSignature')
        .populate('signature.hrSignature')
        .populate('signature.officeManagerSignature')
        .populate({
          path: 'division',
          populate: {
            path: 'details.president.sign',
            model: 'files',
          },
        })
        .populate({
          path: 'division',
          populate: {
            path: 'details.president.name',
            model: 'users',
          },
        })
        .populate('approvedBy')
        .populate('createdBy')
        .populate({
          path: 'division',
          populate: {
            path: 'details.coordinator.sign',
            model: 'files',
          },
        })
        // .populate({
        //   path: 'division',
        //   populate: {
        //     path: 'details',
        //     populate: {
        //       path: 'seniorLeader.sign',
        //       model: 'files',
        //     },
        //   },
        // })
        // .populate({
        //   path: 'division',
        //   populate: {
        //     path: 'details',
        //     populate: {
        //       path: 'juniorLeader.sign',
        //       model: 'files',
        //     },
        //   },
        // })
        .populate({
          path: 'division',
          populate: {
            path: 'details',
            populate: {
              path: 'coordinator.name',
              model: 'users',
            },
          },
        })
        .sort({IRODate: 'desc'}),

      message: 'Successfully fetched list of IROs',
    });
  } catch (error) {
    next(error);
  }
});
IRORouter.get('/reconciliation', authCheck(['READ_IRO']), async (req, res, next) => {
  try {
    // const conditions: FilterQuery<IROrder> = {};
    console.log(req.query, 'req.query');
    const paymentMethods = await PaymentMethod.find({});

    let conditions: FilterQuery<IROrder> = {};
    if (Object.keys(req.query).includes('status')) {
      conditions.status = (req.query.status);
    }
    if (Object.keys(req.query).includes('sourceOfAccount')) {
      conditions.sourceOfAccount = (req.query.sourceOfAccount);
    }
    if (Object.keys(req.query).includes('dateRange')) {
      conditions = {
        ...conditions,
        IRODate: {
          $gte: moment.utc((req.query?.dateRange as unknown as DateRange)?.startDate).startOf('day').toDate(),
          $lt: moment.utc((req.query?.dateRange as unknown as DateRange)?.endDate).endOf('day').toDate(),
        },
        ...(req.query.ExStatus && {sanctionedBank: paymentMethods.map((e) => e.paymentMethod)}),

      };
    }
    sendStandardResponse<IROrder[]>(res, 'OK', {
      // data: await IRO.find({status: {$in: [IROLifeCycleStates.AMOUNT_RELEASED, IROLifeCycleStates.RECONCILIATION_DONE]}})
      data: await IRO.find(conditions)
        .populate('particulars')
        .populate('purposeSubdivision')
        .populate('division')
        .populate({
          path: 'FR',
          populate: [
            {path: 'frd', model: 'frdModel'}, // Populating 'frd' inside 'FR'
            {
              path: 'signature',
              populate: [
                {path: 'coordinator', model: 'files'},
                {path: 'jrLeader', model: 'files'},
                {path: 'srLeader', model: 'files'},
                {path: 'president', model: 'files'},
                {path: 'officeMgr', model: 'files'},
              ],
            },
            {
              path: 'names',
              populate: [
                {path: 'coordinator', model: 'users'},
                {path: 'jrLeader', model: 'users'},
                {path: 'srLeader', model: 'users'},

              ],
            },
            {path: 'particulars', model: 'particulars'},
          ],
        })
        .populate('purposeCoordinator')
        .populate('billAttachment')
        .populate('purposeWorker')
        .populate('releaseAmount')
        .populate('createdBy')
        .populate({
          path: 'particulars',
          populate: {
            path: 'attachment',
            model: 'files',
          },
        })
        .populate({
          path: 'sign',
          populate: {
            path: 'officeMgr',
            model: 'files',
          },
        })
        .populate({
          path: 'sign',
          populate: {
            path: 'president',
            model: 'files',
          },
        })
        .populate({
          path: 'division',
          populate: [
            {
              path: 'details',
              populate: {
                path: 'coordinator.name',
                model: 'users',
              },
            },
            {
              path: 'details',
              populate: {
                path: 'coordinator.sign',
                model: 'files',
              },
            },
          ],
        })
        .sort({updatedAt: 'desc'}),
      message: 'Successfully fetched list of ReconciliationIRO',
    });
  } catch (error) {
    next(error);
  }
});
IRORouter.get('/reconciliationOptimized', authCheck(['READ_IRO']), async (req, res, next) => {
  try {
    // const conditions: FilterQuery<IROrder> = {};
    console.log(req.query, 'req.query');
    const paymentMethods = await PaymentMethod.find({});

    let conditions: FilterQuery<IROrder> = {};
    if (Object.keys(req.query).includes('status')) {
      conditions.status = (req.query.status);
    }
    if (Object.keys(req.query).includes('sourceOfAccount')) {
      conditions.sourceOfAccount = (req.query.sourceOfAccount);
    }
    if (Object.keys(req.query).includes('dateRange')) {
      conditions = {
        ...conditions,
        IRODate: {
          $gte: moment.utc((req.query?.dateRange as unknown as DateRange)?.startDate).startOf('day').toDate(),
          $lt: moment.utc((req.query?.dateRange as unknown as DateRange)?.endDate).endOf('day').toDate(),
        },
        ...(req.query.ExStatus && {sanctionedBank: paymentMethods.map((e) => e.paymentMethod)}),
        ...(req.query.ExStatus && (req.query.ExStatus as any)?.[0] == 71 && {sanctionedBank: {$nin: paymentMethods.map((e) => e.paymentMethod)}}),

      };
    }
    if (req.query.support) {
      if (req.query.support === 'Expanse') {
        conditions = {
          ...conditions,
          $and: [
            {
              $or: [
                {workerSupport: {$exists: false}}, // Field does not exist
                {workerSupport: false}, // Explicitly false
              ],
            },
            {
              $or: [
                {childSupport: {$exists: false}}, // Field does not exist
                {childSupport: false}, // Explicitly false
              ],
            },
          ],
        };
      } else if (req.query.support === 'Support') {
        conditions = {
          ...conditions,
          $or: [{workerSupport: true}, {childSupport: true}],
        };
      }
    }
    sendStandardResponse<IROrder[]>(res, 'OK', {
      // data: await IRO.find({status: {$in: [IROLifeCycleStates.AMOUNT_RELEASED, IROLifeCycleStates.RECONCILIATION_DONE]}})
      data: await IRO.find(conditions)
        .populate('particulars')
        .populate('purposeSubdivision')
        .populate('division')
        .populate('purposeCoordinator')
        .populate('billAttachment')
        .populate('purposeWorker')
        .populate('releaseAmount')
        // .populate('createdBy')
        .populate({
          path: 'division',
          populate: [
            {
              path: 'details',
              populate: {
                path: 'coordinator.name',
                model: 'users',
              },
            },
          ],
        })
        .sort({updatedAt: 'desc'}),
      message: 'Successfully fetched list of ReconciliationIRO',
    });
  } catch (error) {
    next(error);
  }
});


IRORouter.get('/release_amount/:id', authCheck(['READ_IRO']), async (req, res, next) => {
  console.log('SINDLE RELEASE');
  console.log(req.body, 'ppp9');

  try {
    sendStandardResponse<IReleaseAmount | null>(res, 'OK', {
      data: await ReleaseAmount.findById(req.params.id)
        .populate({
          path: 'IRO',
          populate: {
            path: 'division',
            model: 'divisions',
          },
        })
        .populate({
          path: 'IRO',
          populate: {
            path: 'purposeSubdivision',
            model: 'sub_divisions',
          },
        })
        .populate({
          path: 'IRO',
          populate: {
            path: 'particulars',
            model: 'particulars',
          },
        })
        .populate('attachment'),
      message: 'Successfully fetched releaseAmount',
    });
  } catch (error) {
    next(error);
  }
});


/**
 * For create a FR
 * [POST] /fr/
 *
 * @author <annmariya@computervalley.online>, <@annmariya>
 *
 * ✍🏻
 */
IRORouter.post('/release_amount/', authCheck(['MANAGE_IRO']), async (req, res, next) => {
  try {
    const IROs: any[]=[];
    console.log(req.body.releaseAmount.modeOfPayment.paymentMethod, 'D');
    console.log(req.body.releaseAmount, '4545');
    const {transferredAmount, releaseAmount: releaseAmountValue} = req.body.releaseAmount;

    // return;
    IROs.push(req.body.iros.map((e:IROrder)=>e.IROno));
    if (req.body?.iros?.some((item: { status: any; }) => item.status == IROLifeCycleStates.WAITING_FOR_ACCOUNTS_STATE)) {
      let transferredAmountEach = req.body.releaseAmount?.transferredAmountEach;
      const releaseAmountId = new mongoose.Types.ObjectId();
 
      // If transferredAmountEach is undefined or null, build it from iros sanctioned amounts
      if (!transferredAmountEach || Object.keys(transferredAmountEach).length === 0) {
        transferredAmountEach = {};
        req.body.iros.forEach((iro: IROrder) => {
          transferredAmountEach[String(iro._id)] = iro.sanctionedAmountTotal || 0;
        });
      }

      const releaseAmount = new ReleaseAmount({
        ...req.body.releaseAmount,
        modeOfPayment: req.body.releaseAmount.modeOfPayment.paymentMethod ?? req.body.releaseAmount.modeOfPayment,
        transferredAmount: transferredAmount !== 0 ? transferredAmount : releaseAmountValue,
        transferredAmountEach: transferredAmountEach,
        _id: releaseAmountId,
        status: IROLifeCycleStates.ACTIVE,
      });

      (Array.isArray(req.body.attachment) ?
        req.body.releaseAmount.attachment.map((async (file: mongoose.UpdateQuery<IFile>) => await FileObject.updateOne({_id: file._id}, {
          refId: releaseAmountId,
        }))) : null);

      await releaseAmount.validate();
      await releaseAmount.save();
      const iros = await Promise.all(req.body.iros.map(async (_iro: IROrder) => {
        const iro= await IRO.findByIdAndUpdate(
          _iro._id,
          {
            releaseAmount: releaseAmountId,
            status: IROLifeCycleStates.WAITING_FOR_RELEASE_AMOUNT,
            groupIros: IROs[0],
          },
        ).populate('releaseAmount').populate('division').populate('createdBy');

        new TransactionLog({TRNo: iro?.IROno, TRId: new mongoose.Types.ObjectId(_iro._id),
          action: 'amount release requested', type: 'IRO', doneBy: res.locals.authUser._id}).save();
        return iro;
      }));
      const iross = iros.map((e: IROrder) => {
        // if (typeof e._id !== 'string') {
        //   throw new Error(`Invalid _id type: expected string but got ${typeof e._id}`);
        // }
        return new mongoose.Types.ObjectId(e._id); // Directly create ObjectId from string
      });

      const newGroupedIRO = new GroupedIRO({
        IRO: iross, // Assign the mapped IROs to the new document
      });
      await newGroupedIRO.save();
      const newGroupedIROView = new GroupedIROView({
        IRO: iross, // Assign the mapped IROs to the new document
      });
      await newGroupedIROView.save();

      console.log(iros, 'iros21');
      sendStandardResponse(res, 'OK', {
        data: iros,
        message: 'Sent to accounts manager',
      });
      console.log('At least one item in iros has a status property.');
      IROEvents.emit('release', {data: iros});
    } else {
      const releaseAmountId = new mongoose.Types.ObjectId();
      const releaseAmount = new ReleaseAmount({
        ...req.body.releaseAmount,
        modeOfPayment: req.body.releaseAmount.modeOfPayment?.paymentMethod ?? req.body.releaseAmount.modeOfPayment,
        transferredAmount: transferredAmount !== 0 ? transferredAmount : releaseAmountValue,

        _id: releaseAmountId,
        status: IROLifeCycleStates.ACTIVE,
      });

      (Array.isArray(req.body.attachment) ?
        req.body.releaseAmount.attachment.map((async (file: mongoose.UpdateQuery<IFile>) => await FileObject.updateOne({_id: file._id}, {
          refId: releaseAmountId,
        }))) : null);

      await releaseAmount.validate();
      await releaseAmount.save();

      const iros = await Promise.all(req.body.iros.map(async (_iro: IROrder) => {
        const iro= await IRO.findByIdAndUpdate(
          _iro,
          {
            releaseAmount: releaseAmountId,
            status: IROLifeCycleStates.AMOUNT_RELEASED,
          },
        ).populate('releaseAmount').populate('division').populate('createdBy');
        new TransactionLog({TRNo: iro?.IROno, TRId: new mongoose.Types.ObjectId(_iro._id), action: 'amount released', type: 'IRO', doneBy: res.locals.authUser._id}).save();
        return iro;
      }));
      console.log(iros, 'iros888');
      
      sendStandardResponse(res, 'OK', {
        data: iros,
        message: 'Release Amount Successful for IRO',
      });
      // console.log(iros);
      IROEvents.emit('release', {data: iros});

      // FREvents.emit('create', fr);
      console.log('No item in iros has a status property.');
    }
    // console.log(req.params.IROId, 'IROId');

    // console.log(req.body, '23332323');
    // const {
    //   releaseAmount,
    //   transferredAmount,
    //   bankName,
    //   branchName,
    //   accountNumber,
    //   modeOfPayment,
    //   transactionNumber,
    //   transferredDate,
    // } = req.body;
  } catch (error) {
    next(error);
  }
});
IRORouter.patch('/release_amount/', authCheck(['MANAGE_IRO']), async (req, res, next) => {
  // try {
  const IROs: any[]=[];
  console.log(req.body.releaseAmount.transferredAmount, '1111');
  console.log(req.body, '4545');


  const iros= await ReleaseAmount.updateOne(
    {_id: req.body.releaseAmount._id}, // Find by releaseAmountId
    {
      $set: {
        ...req.body.releaseAmount,
        modeOfPayment: req.body.releaseAmount.modeOfPayment?.paymentMethod ?? req.body.releaseAmount.modeOfPayment,
        status: IROLifeCycleStates.ACTIVE,
        transferredAmount: req.body.releaseAmount.transferredAmount,
      },
    },
  );

  // Updating existing attachments with refId
  if (Array.isArray(req.body.releaseAmount.attachment)) {
    await FileObject.updateMany(
      {_id: {$in: req.body.releaseAmount.attachment.map((file: IFile) => file._id)}}, // Find all attachments by IDs
      {$set: {refId: req.body.releaseAmount._id}}, // Update refId
    );
  }


  sendStandardResponse(res, 'OK', {
    data: iros,
    message: 'Release Amount Successful for IRO',
  });
  // console.log(iros);
  // IROEvents.emit('release', {data: iros});

  // FREvents.emit('create', fr)
});
IRORouter.post('/custom', authCheck(['WRITE_IRO']), async (req, res, next) => {
  try {
    console.log(req.body, 'Shibind88');
    const CusIRO= await CustomIRO.findOne({IROno: `IRO${req.body.FRno}`});
    console.log(CusIRO, 'CusIRO');
    const CusI = await IRO.findOne({IROno: `IRO${req.body.FRno}`});
    console.log(CusIRO, 'CusIRO');

    if (CusIRO) {
      return sendStandardResponse(res, 'BAD REQUEST', {
        data: 'Custom IRONo already exists',
        message: 'IRONo already exists',
      });
    }
    if (CusI) {
      return sendStandardResponse(res, 'BAD REQUEST', {
        data: 'IRONo already exists',
        message: 'IRONo already exists',
      });
    }
    const divs= await Division.findById(res.locals.authUser.division);
    console.log(divs?.details.coordinator?.sign, 'popo');
    const eSign= await esignature.find({});
    const FRno='FRN' +
        (
          await FormattedCode.findOneAndUpdate(
            {},
            {$inc: {FRCode: 1}},
            {new: true},
          )
        )?.FRCode.toString().padStart(4, '0');
    const FRId = new mongoose.Types.ObjectId();
    const fr = new CustomIRO({
      ...req.body,
      createdBy: res.locals.authUser._id,
      status: IROLifeCycleStates.IRO_CLOSED,
      division: req.body.division ?? res.locals.authUser.division,
      closingBalance: req.body.closingBalance,
      adjustedIro: req.body.adjustedIro,
      sanctionedBank: req.body.sanctionedBank,
      adjustedAmount: req.body.adjustedAmount,
      closingBalanceRemark: req.body.closingBalanceRemark,
      specialsanction: 'No',
      purposeWorker: req.body?.purposeWorker?._id,
      releaseAmount: req.body?.releaseAmount,
      modeOfPayment: req.body?.modeOfPayment.paymentMethod,
      officeManagerSign: req.body?.officeManagerSign?.[0]?._id,
      IROno: `IRO${req.body.FRno}`,
      FRNumber: `FRN${req.body.FRNumber}`,
      IRODate: req.body.FRdate,
      kind: 'IRO',
      _id: FRId,
      signature: {
        coordinator: divs?.details.coordinator?.sign,
        jrLeader: divs?.details.juniorLeader?.sign,
        srLeader: divs?.details.seniorLeader?.sign,
        president: eSign[0]?.presidentSignature,
        // officeMgr: eSign[0]?.officeManagerSignature,
      },
      names: {
        coordinator: divs?.details.coordinator?.name,
        jrLeader: divs?.details.juniorLeader?.name,
        srLeader: divs?.details.seniorLeader?.name,
        president: eSign[0]?.presidentName,
        // officeMgr: eSign[0]?.officeManagerName,
      },
    });
    await fr.validate();
    console.log(fr, 'popfr');
    const div= await Division.findById(fr.division);
    if (req.body.status ==FRLifeCycleStates.WAITING_FOR_PRESIDENT) {
      const prSign= await esignature.find();
      console.log(div?.details.name, 'signn');

      await Mailer.sendMail({
        to: prSign[0].presidentEmail,
        from: `AOMS <${process.env.EMAIL}>`,
        subject: 'Sent Fr request to president',
        html: ` Sir/Maam,<br/><br/> ${fr.FRno} from ${div?.details.name} division has been forwarded to the President for approval.
.<br/><br/> Kindly check.`,
      });

      await Mailer.sendMail({
        to: prSign[0].presidentEmail,
        from: `AOMS ${process.env.EMAIL}`,
        subject: `A Finance Request is waiting for President’s sanction from ${div?.details.name}`,
        html: `Dear Sir,<br/><br/>
             A finance request from ${div?.details.name} is currently awaiting your sanction. Kindly review the request and do the needful at your earliest convenience to facilitate further action.<br/><br/>
             Thank you for your prompt attention to this matter.
`,
      });
    }
    // console.log(res.locals.authUser.officialDetails.divisionHistory);
    await fr.save();
    console.log(fr, 'fr.FRno');

    new TransactionLog({TRNo: fr.IROno, TRId: FRId, action: 'created', type: 'IRO', doneBy: res.locals.authUser._id}).save();
    sendStandardResponse(res, 'OK', {
      data: fr,
      message: 'Successfully added new Custom IRO',
    });
    FREvents.emit('create', {data: fr, initiator: res.locals.authUser});
  } catch (error) {
    next(error);
  }
});
IRORouter.post(
  '/FrNoEdit',
  authCheck(['READ_IRO']),
  async (req, res, next) => {
    try {
      console.log(req.body, 'req.body543');
      const newFR = await FR.updateOne(
        {FRno: req.body.oldNo}, // Query filter
        {$set: {FRno: req.body.newNo}}, // Update operation
      );

      console.log(newFR, 'req.body543');
      sendStandardResponse(res, 'OK', {
        data: newFR,
        message: 'Successfully Edited',
      });
    } catch (error) {
      next(error);
    }
  },
);

IRORouter.post(
  '/remarks',
  authCheck(['READ_IRO']),
  async (req, res, next) => {
    try {
      const remark = new iroRemarks({
        ...req.body,
        createdBy: res.locals.authUser._id,
      });
      await remark.validate();
      sendStandardResponse(res, 'OK', {
        data: await iroRemarks.populate(await remark.save(), 'createdBy'),
        message: 'Successfully added new Remarks',
      });
      remarkEvents.emit('create', {data: remark, initiator: res.locals.authUser});
    } catch (error) {
      next(error);
    }
  },
);

IRORouter.get(
  '/remarks/:IROId',
  authCheck(['READ_IRO']),
  async (req, res, next) => {
    try {
      sendStandardResponse<IRemark[]>(res, 'OK', {
        data: await iroRemarks.find({IRO: req.params.IROId}).populate(
          'createdBy',
        ),
        message: 'Successfully fetched Remarks',
      });
    } catch (error) {
      next(error);
    }
  },
);
/**
 * For post notification
 * [POST] /sent/:name/:id
 *
 * @author <madhuhsmadhu18@gmail.com>, <@madhu.h.s>
 * ✍🏻👉📤
 */
IRORouter.post('/sent/:name/:id',
  authCheck(['READ_FR']),
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async (req, res) => {
    // if(name=='pr')
    const fr = await FR.findOne({IRO: req.params.id}).populate('division');

    await User.aggregate([
      {
        $lookup: {
          from: 'user_permissions',
          localField: 'permissions',
          foreignField: '_id',
          as: 'permissions',
        },
      },
      {
        $match: {
          $expr: {
            $cond: {
              if: {$eq: [req.params.name, 'president']},
              then: {$in: [true, '$permissions.PRESIDENT_ACCESS']},
              else: {
                $cond: {
                  if: {$eq: [req.params.name, 'accounts']},
                  then: {
                    $cond: {
                      if: {
                        $eq: [fr?.sanctionedBank, 'FCRA'],
                      },
                      then: {
                        $in: [true, '$permissions.FCRA_ACCOUNTS_ACCESS'],
                      },
                      else: {
                        $cond: {
                          if: {
                            $eq: [fr?.sanctionedBank, 'Local Bank'],
                          },
                          then: {
                            $in: [true, '$permissions.LOCAL_ACCOUNT_ACCESS'],
                          },
                          else: {
                            $cond: {
                              if: {
                                $eq: [fr?.sanctionedBank, 'Other Bank'],
                              },
                              then: {
                                $in: [true, '$permissions.OTHER_ACCOUNTS_ACCESS'],
                              },
                              else: false,
                            },
                          },
                        },
                      },
                    },
                  },
                  else: {
                    $cond: {
                      if: {$eq: [req.params.name, 'office_manager']},
                      then: {$in: [true, '$permissions.OFFICE_MNGR_ACCESS']},
                      else: {
                        $cond: {
                          if: {$eq: [req.params.name, 'account_manager']},
                          then: {$in: [true, '$permissions.ACCOUNTS_MNGR_ACCESS']},
                          else: false,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      // 'permissions.PRESIDENT_ACCESS': true,

    ])
      .exec()
      .then(async (usersWithWriteAccessToAccounts: IUser[]) => {
        // console.log(usersWithWriteAccesssToBudgetCode);
        let userIds = usersWithWriteAccessToAccounts.map((user) => {
          return user._id;
        });
        if (req.params.name == 'division_head') {
          userIds = [fr?.division?.details.coordinator?.name];
          // console.log('divHead:', fr?.division?.details.coordinator?.name);
          // console.log(await IRO.findById(req.params.id).then((res)=>res?.createdBy), 'createdBy');
        }

        // eslint-disable-next-line camelcase

        // const curUserDiv=(curUser as IUser).officialDetails.divisionHistory[(curUser as IUser).officialDetails.divisionHistory.length-1].division.details.name.trim();
        // console.log('🚀 ~ file: index.ts:147 ~ User.findById ~ curUserDiv:', curUserDiv);
        new Message({
          _id: new mongoose.Types.ObjectId(),
          title: 'Please check the IRO',
          body: 'Evaluate the IRO and Mark your remarks',
          ref_url: `http://aoms.ietapps.org/iro/${req.params.id}`,
          recipients: userIds.map((item) => ({user: item, read: false})),
          division: fr?.division.details.name.trim(),
          type: 'push',
        }).save()
          .then((result) => {
            sendStandardResponse(res, 'OK', {
              message: 'Message sent Successfully ',
            });
          }).catch((err) => {
            console.log(err);
          });
        console.log('sending message...');
        MessagingService.send('push', userIds, {
          title: 'Please check the IRO',
          body: 'Evaluate the IRO and Mark your remarks',
          referenceURL: `http://aoms.ietapps.org/iro/${req.params.id}`,
        })
          .catch((error) => {
            console.log(error);
          });
      })
      .catch((error) => {
        console.log(error);
      });
    // sendStandardResponse(res, 'OK', {
    //   message: 'Message sent successfully',
    // });
  },
);
IRORouter.get('/optimized/:IROId', authCheck(['READ_IRO']), async (req, res, next) => {
  try {
    let conditions: FilterQuery<IROrder> = {
    };
    // console.log(req.query.status?.[0], 'req.query.status');

    const paymentMethods = await PaymentMethod.find({});
    console.log(req.query.ExStatus, 'req.query.status');

    // if ((req.query.Exstatus as any)?.[0] == 69) {
    //   conditions.sanctionedBank = paymentMethods.map((e)=>e.paymentMethod);
    //   conditions.status = (req.query.status);
    // }
    if (Object.keys(req.query).includes('status')) {
      conditions.status = (req.query.status);
    }
    if (res.locals.authUser.kind == 'worker') {
      conditions.division = res.locals.authUser.division;
    }
    if (Object.keys(req.query).includes('sourceOfAccount')) {
      conditions.sourceOfAccount = (req.query.sourceOfAccount);
    }
    // console.log(req.params., 'req.query?.dateRange');

    // conditions.status=IROLifeCycleStates.WAITTING_FOR_RELEASE_AMOUNT;
    console.log(req.query, 'req.query.sourceOfAccount');
    if (Object.keys(req.query).includes('dateRange')) {
      conditions = {
        ...conditions,
        IRODate: {
          $gte: moment.utc((req.query?.dateRange as unknown as DateRange)?.startDate).startOf('day').toDate(),
          $lt: moment.utc((req.query?.dateRange as unknown as DateRange)?.endDate).endOf('day').toDate(),
        },
        ...(req.query.Exstatus && {sanctionedBank: paymentMethods.map((e) => e.paymentMethod)}),
      };
    }
    console.log(conditions, 'conditions77');
    sendStandardResponse<IROrder[]>(res, 'OK', {
      data: await IRO.find({_id: req.params?.IROId})
        .populate('releaseAmount')
        .populate('revertedBy')
        .populate('particulars')
        .populate({
          path: 'FR',
          populate: [
            {path: 'frd', model: 'frdModel'}, // Populating 'frd' inside 'FR'
            {
              path: 'signature',
              populate: [
                {path: 'coordinator', model: 'files'},
                {path: 'jrLeader', model: 'files'},
                {path: 'srLeader', model: 'files'},
                {path: 'president', model: 'files'},
                {path: 'officeMgr', model: 'files'},
              ],
            },
            {
              path: 'names',
              populate: [
                {path: 'coordinator', model: 'users'},
                {path: 'jrLeader', model: 'users'},
                {path: 'srLeader', model: 'users'},


              ],
            },
            {
              path: 'names',
              populate: [
                {
                  path: 'coordinator',
                  model: 'users',
                  populate: {
                    path: 'officialDetails.eSign',
                    model: 'files',
                  },
                },
                {
                  path: 'jrLeader',
                  model: 'users',
                  populate: {
                    path: 'officialDetails.eSign',
                    model: 'files',
                  },
                },
                {
                  path: 'srLeader',
                  model: 'users',
                  populate: {
                    path: 'officialDetails.eSign',
                    model: 'files',
                  },
                },
              ],
            },
            {
              path: 'signatureDelhiDiv',
              populate: [
                {
                  path: 'jrLeader',
                  model: 'users',
                  populate: {
                    path: 'officialDetails.eSign',
                    model: 'files',
                  },
                },
                {
                  path: 'srLeader',
                  model: 'users',
                  populate: {
                    path: 'officialDetails.eSign',
                    model: 'files',
                  },
                },
              ],
            },

            {path: 'particulars', model: 'particulars'},
            {path: 'division', model: 'divisions'},
          ],
        })

        .populate('particulars')
        .populate('purposeSubdivision')
        .populate('division')
        .populate('purposeCoordinator')
        .populate('billAttachment')
        .populate('purposeWorker')
        .populate('signature.accountManagerSignature')
        .populate('signature.accountantSignature')
        .populate('signature.hrSignature')
        .populate('signature.officeManagerSignature')
        .populate({
          path: 'division',
          populate: {
            path: 'details.president.sign',
            model: 'files',
          },
        })
        .populate({
          path: 'division',
          populate: {
            path: 'details.president.name',
            model: 'users',
          },
        })
        .populate('approvedBy')
        .populate('createdBy')
        .populate({
          path: 'division',
          populate: {
            path: 'details.coordinator.sign',
            model: 'files',
          },
        })
        .populate({
          path: 'division',
          populate: {
            path: 'details',
            populate: {
              path: 'seniorLeader.sign',
              model: 'files',
            },
          },
        })
        .populate({
          path: 'division',
          populate: {
            path: 'details',
            populate: {
              path: 'seniorLeader.sign',
              model: 'files',
            },
          },
        })
        .populate({
          path: 'division',
          populate: {
            path: 'details',
            populate: {
              path: 'juniorLeader.sign',
              model: 'files',
            },
          },
        })
        .populate({
          path: 'division',
          populate: {
            path: 'details',
            populate: {
              path: 'coordinator.name',
              model: 'users',
            },
          },
        })
        .populate({
          path: 'division',
          populate: {
            path: 'details',
            populate: {
              path: 'juniorLeader.name',
              model: 'users',
            },
          },
        })
        .populate({
          path: 'division',
          populate: {
            path: 'details',
            populate: {
              path: 'seniorLeader.name',
              model: 'users',
            },
          },
        })
        .sort({IRODate: 'desc'}),

      message: 'Successfully fetched list of IROs',
    });
  } catch (error) {
    next(error);
  }
});
IRORouter.get('/:IROId', authCheck(['READ_IRO']), async (req, res, next) => {
  try {
    sendStandardResponse<IROrder | null>(res, 'OK', {
      data: await IRO.findById(req.params.IROId)
        .populate('purposeSubdivision')
        .populate('division')
        .populate('purposeCoordinator')
        .populate('purposeWorker')
        .populate('particulars')
        .populate('releaseAmount')
        .populate('createdBy')
        .populate('sign.officeMgr')
        .populate('sign.president')
        .populate({
          path: 'releaseAmount',
          populate: {
            path: 'attachment',
            model: 'files',
          },
        })
        .populate({
          path: 'particulars',
          populate: [
            {
              path: 'attachment',
              model: 'files',
            },
            {
              path: 'applicationAttachment',
              model: 'files',
            },
          ],
        }),
      message: 'Successfully fetched IRO',
    });
  } catch (error) {
    next(error);
  }
});
IRORouter.get('/:IROId/custom', authCheck(['READ_IRO']), async (req, res, next) => {
  try {
    sendStandardResponse<any | null>(res, 'OK', {
      data: await CustomIRO.findById(req.params.IROId)
        .populate('purposeSubdivision')
        .populate('division')
        .populate('purposeCoordinator')
        .populate('purposeWorker')
        .populate('particulars')
        .populate('createdBy')
        .populate('attachment')
        .populate('presidentSign')
        .populate('officeManagerSign')
        // .populate('sign.president')
        // .populate({
        //   path: 'releaseAmount',
        //   populate: {
        //     path: 'attachment',
        //     model: 'files',
        //   },
        // })
        .populate({
          path: 'particulars',
          populate: {
            path: 'attachment',
            model: 'files',
          },
        }),
      message: 'Successfully fetched IRO',
    });
  } catch (error) {
    next(error);
  }
});
/**
 * For Get  a IRO log by Id
 * [GET] /fr/{IRO id}/log
 *
 * ✍🏻
 */
IRORouter.get('/:IROId/log', authCheck(['READ_FR']), async (req, res, next) => {
  try {
    sendStandardResponse<ITransactionLog[]| null>(res, 'OK', {
      data: await TransactionLog.find({TRId: req.params.IROId}).populate('doneBy').sort({createdAt: 1}),
      message: 'Successfully fetched IRO log',
    });
  } catch (error) {
    next(error);
  }
});
IRORouter.patch(
  '/:IROId',
  authCheck([]),
  async (req, res, next) => {
    try {
      console.log(req.body, 'req.body88');
      const date = new Date(req.body.IRORequest.IRODate);
      date.setUTCHours(16, 16, 47, 17);
      const updatedDateStr = date.toISOString().replace('Z', '+00:00');
      console.log(updatedDateStr, 'updatedDateStr'); // "2024-11-11T16:16:47.017+00:00"
      if (
        Object.keys(req.body).includes('activate') ||
        Object.keys(req.body).includes('deactivate')
      ) {
        next(
          new Error(
            'activate and deactivate fields are not allowed by this API endpoint!',
          ),
        );
      }
      let status;
      let reasonForRevertToDivision;
      if (req.body.IRORequest.status==IROLifeCycleStates.REVERTED_TO_DIVISION && req.body.flag !==true) {
        status=IROLifeCycleStates.WAITING_FOR_OFFICE_MNGR;
        reasonForRevertToDivision='';
      } else {
        reasonForRevertToDivision=req.body.reasonForRevertToDivision;

        status=req.body.status;
      }

      const previousIRO = await IRO.findById(req.params.IROId);
      const newIRO = await IRO.findByIdAndUpdate(req.params.IROId, {...req.body.IRORequest, IRODate: updatedDateStr, status: status, reasonForRevertToDivision: reasonForRevertToDivision, purposeWorker: req.body.IRORequest?.purposeWorker?._id}, {
        new: true,
      }).populate('billAttachment').populate('division')
        .populate('createdBy');
      const newFR = await FR.findByIdAndUpdate(newIRO?.FR, {sanctionedBank: newIRO?.sanctionedBank, sourceOfAccount: newIRO?.sourceOfAccount}, {
        new: true,
      });
      console.log(newFR, 'newFR99');

      if (!previousIRO || !newIRO) {
        return next(new Error('IRO ID Not found'));
      }
      (Array.isArray(req.body.billAttachment) ?
        req.body.IRORequest.billAttachment.map((async (file: mongoose.UpdateQuery<IFile>) => await FileObject.updateOne({_id: file._id}, {
          refId: newIRO._id,
        }))) : null);
      if (req.body.signatureSheet) {
        await FileObject.findByIdAndUpdate(req.body.signatureSheet, {
          refId: newIRO._id,
        });
      }
      const logx = new TransactionLog({
        TRNo: newIRO?.IROno,
        TRId: new mongoose.Types.ObjectId(req.params.IROId),
        action: 'Edited',
        type: 'IRO',
        doneBy: res.locals.authUser._id,
      }).save();
      if (previousIRO.status ==IROLifeCycleStates.REVERTED_TO_DIVISION) {
        const logxx = new TransactionLog({
          TRNo: newIRO?.IROno,
          TRId: new mongoose.Types.ObjectId(req.params.IROId),
          action: 'resubmitted',
          type: 'IRO',
          doneBy: res.locals.authUser._id,
        }).save();
      }
      console.log(logx, 'EDITED &&');
      sendStandardResponse(res, 'OK', {
        data: newIRO,
        message: 'Successfully updated IRO',
      });
      console.log(req.body.notify, 'req');
      // eslint-disable-next-line camelcase
      if (req.body.notify) {
        IROEvents.emit('update', {data: newIRO});
      }
    } catch (error) {
      next(error);
    }
  },
);
IRORouter.patch(
  '/custom/:IROId',
  authCheck([]),
  async (req, res, next) => {
    try {
      console.log(req.body, 'Shibind88');

      const {IRORequest} = req.body;
      const {IROno, _id} = IRORequest; // Extract IROno and _id from request body
      console.log(IRORequest, 'IRORequest');
      console.log(IROno, _id, 'IRORequest');

      // Find another document with the same IROno but a different _id
      const existingIRO = await CustomIRO.findOne({IROno, _id: {$ne: _id}});
      const existing = await IRO.findOne({IROno: IROno});

      console.log(existingIRO?.IROno, 'existingIRO?.IROno');
      console.log(existing, 'req.body.IRORequest.IROno');

      if (existingIRO) {
        return sendStandardResponse(res, 'BAD REQUEST', {
          data: 'IRONo already exists',
          message: 'Custom IRONo already exists',
        });
      }
      if (existing) {
        return sendStandardResponse(res, 'BAD REQUEST', {
          data: 'IRONo already exists',
          message: 'IRONo already exists',
        });
      }

      // Proceed with the update logic


      // console.log(req.body, 'req.body88');
      // const ID= new mongoose.Types.ObjectId();
      // let particular;
      // req.body.IRORequest.particulars.particulars?.map((e)=>{
      //   if (!e._id) {
      //     particular = new Particulars({...e, _id: ID, status: FRLifeCycleStates.ACTIVE});
      //     particular.save();
      //   }
      // });
      // console.log(particular, 'particular3434');
      // req.body.IRORequest.particulars.push(ID);
      // delete req.body.IRORequest.particulars;

      const date = new Date(req.body.IRORequest.IRODate);
      date.setUTCHours(16, 16, 47, 17);
      const updatedDateStr = date?.toISOString().replace('Z', '+00:00');
      console.log(updatedDateStr, 'updatedDateStr'); // "2024-11-11T16:16:47.017+00:00"

      if (
        Object.keys(req.body).includes('activate') ||
        Object.keys(req.body).includes('deactivate')
      ) {
        next(
          new Error(
            'activate and deactivate fields are not allowed by this API endpoint!',
          ),
        );
      }
      let status;
      if (req.body.IRORequest.status==IROLifeCycleStates.REVERTED_TO_DIVISION && req.body.flag !==true) {
        status=IROLifeCycleStates.WAITING_FOR_OFFICE_MNGR;
      } else {
        status=req.body.status;
      }

      // const data= await CustomIRO.updateOne({_id: req.params.IROId}, {
      //   $push: {particulars: particular?._id},
      // });
      // return;
      // console.log(req.body.IRORequest.particulars, 'req.body88434');
      const previousIRO = await CustomIRO.findById(req.params.IROId);
      const newIRO = await CustomIRO.findByIdAndUpdate(req.params.IROId, {...req.body.IRORequest, modeOfPayment: req.body.IRORequest.modeOfPayment, updatedDateStr, status: status, purposeWorker: req.body.IRORequest?.purposeWorker?._id}, {
        new: true,
      }).populate('division')
        .populate('createdBy');
      const newFR = await FR.findByIdAndUpdate(newIRO?.FR, {sanctionedBank: newIRO?.sanctionedBank, sourceOfAccount: newIRO?.sourceOfAccount}, {
        new: true,
      });
      console.log(newIRO, 'newFR99');
      const getData=((previousIRO:any, newIRO:any)=>{
        const changedFields: { field: string; oldValue: any; newValue: any; }[] = [];
        const schemaPaths = Object.keys(previousIRO.toObject()); // Get all schema field names

        schemaPaths.forEach((field) => {
          const previousValue = previousIRO[field];
          const newValue = newIRO[field];

          // Skip comparing the _id and timestamps as they are not relevant for logging changes
          if (field === '_id' || field === 'createdAt' || field === 'updatedAt' || field === 'createdBy' || field ==='division' || previousValue=== ObjectId) return;

          // Compare the values; handle ObjectId and direct values
          if (previousValue?.toString() !== newValue?.toString()) {
            changedFields.push({
              field,
              oldValue: previousValue,
              newValue: newValue,
            });
          }
        });

        return changedFields;
      });
      console.log(req.body, 'req.body99');
      if (!previousIRO || !newIRO) {
        return next(new Error('IRO ID Not found'));
      }
      (Array.isArray(req.body.billAttachment) ?
        req.body.IRORequest.billAttachment.map((async (file: mongoose.UpdateQuery<IFile>) => await FileObject.updateOne({_id: file._id}, {
          refId: newIRO._id,
        }))) : null);
      if (req.body.signatureSheet) {
        await FileObject.findByIdAndUpdate(req.body.signatureSheet, {
          refId: newIRO._id,
        });
      }
      const changedFields = getData(previousIRO, newIRO);
      console.log(changedFields, 'changedFields');

      // If changes are detected, log them
      if (changedFields.length > 0) {
        // Loop through each changed field and create a separate log
        for (const change of changedFields) {
          const logMessage = `${change.field}: ${change.oldValue} -> ${change.newValue}`;
          console.log(logMessage, 'logMessage');

          // Save a new transaction log for each change
          const logs= await new TransactionLog({
            TRNo: newIRO.IROno,
            TRId: new mongoose.Types.ObjectId(req.params.IROId),
            action: logMessage, // Or 'Modified' depending on your use case
            type: 'IRO',
            doneBy: res.locals.authUser._id,
            // message: logMessage.toString(),
          }).save();
          console.log(logs, 'logs88');
        }
      }

      sendStandardResponse(res, 'OK', {
        data: newIRO,
        message: 'Successfully updated IRO',
      });
      console.log(req.body.notify, 'req');
      // eslint-disable-next-line camelcase
    } catch (error) {
      next(error);
    }
  },
);

/**
 * For updating a IRO for specific operation
 * [PATCH] /iro/{iro id}/{operation}
 *
 * @author <annmariya@computervalley.online>, <@annmariyacomputervalley>
 *
 * ✍🏻
 */
IRORouter.patch(
  '/:IROId/close',
  authCheck(['READ_IRO']),
  async (req, res, next) => {
    try {
      const iro = await IRO.findByIdAndUpdate(
        req.params.IROId,
        {
          status: IROLifeCycleStates.IRO_CLOSED,
          closedIroPdf: new mongoose.Types.ObjectId(req.body.fileId),
        },
        {new: true},
      ).populate('division')
        .populate('FR')
        .populate('createdBy');
      new TransactionLog({TRNo: iro?.IROno, TRId: new mongoose.Types.ObjectId(req.params.IROId), action: 'closed', type: 'IRO', doneBy: res.locals.authUser._id}).save();

      console.log(iro?.iroClosedOn, 'iroo');
      if (!iro?.iroClosedOn) {
        await IRO.findByIdAndUpdate(
          req.params.IROId,
          {
            iroClosedOn: new Date(),

          },
          {new: true},
        ).populate('division')
          .populate('FR')
          .populate('createdBy');
      }
      const fr = await FR.findOneAndUpdate(
        {IRO: req.params.IROId},
        {
          status:
          FRLifeCycleStates.FR_CLOSED,
        },
        {new: true},
      );
      new TransactionLog({TRNo: fr?.FRno, TRId: new mongoose.Types.ObjectId(fr?._id), action: 'closed', type: 'FR', doneBy: res.locals.authUser._id}).save();


      // if the Reconsillation IRO is closed then FR Status will be also closed


      if (!iro) {
        return next(new Error('IRO ID Not found'));
      }
      if (!fr) {
        return next(new Error('FR ID Not found'));
      }
      sendStandardResponse(res, 'OK', {
        data: {iro: iro, fr: fr},
        message: 'Successfully closed IRO',
      });

      IROEvents.emit('approve', {data: {newIRO: iro, status: 'close'}});

      //  else if (req.params.operation === 'approve'){
      //   staffEvents.emit('approve', staff);
      // }else {
      //   staffEvents.emit('deactivate', staff);
      // }
    } catch (error) {
      next(error);
    }
  },
);

/**
 * For updating a IRO for specific operation
 * [PATCH] /iro/{iro id}/{operation}
 *
 * @author <annmariya@computervalley.online>, <@annmariyacomputervalley>
 *
 * ✍🏻
 */
IRORouter.patch(
  '/:IROId/:operation',
  authCheck(['READ_IRO']),
  async (req, res, next) => {
    try {
      if (
        !['officeManagerApprove', 'accountManagerApprove', 'reopened', 'rejected', 'revert', 'revert_to_division', 'close', 'reconciliation_complete'].includes(
          req.params.operation,
        )
      ) {
        next(
          new Error(
            'Only close/approve/reject operations are allowed by this API endpoint!',
          ),
        );
      }

      console.log(req.body.reason, '989');

      const fm = await esignature.findOne();
      // console.log(fm?.officeManagerSignature, 'fm');

      // add new signature with existing signature
      const existingIRO = await IRO.findById(req.params.IROId);
      console.log(existingIRO, 'existingIRO');
      if (req.params.operation === 'accountManagerApprove') {
        const countDocument = await Counts.findOne({});
        // const c= new Counts({
        //   IRAppliedCount: IROcount,
        // });
        // c.save();
        await Counts.updateOne(
          {},
          {$set: {IRAppliedCount: (Number(countDocument?.IRAppliedCount) || 0) + 1}},
        );
      }
      const updatedSignature = {...existingIRO?.signature};

      if (req.params.operation === 'officeManagerApprove') {
        updatedSignature.officeManagerSignature = fm?.officeManagerSignature;
      }
      const iro = await IRO.findByIdAndUpdate(
        req.params.IROId,
        {
          status:
            req.params.operation === 'officeManagerApprove' ?
              IROLifeCycleStates.WAITING_FOR_ACCOUNTS_STATE :
              req.params.operation === 'accountManagerApprove' ?
                IROLifeCycleStates.WAITING_FOR_ACCOUNTS_STATE :
                req.params.operation === 'close' ?
                  IROLifeCycleStates.IRO_CLOSED :
                  req.params.operation === 'rejected' ?
                    IROLifeCycleStates.REJECTED :
                    req.params.operation === 'revert' ?
                      IROLifeCycleStates.IRO_IN_PROCESS :
                      req.params.operation === 'reconciliation_complete' ?
                        IROLifeCycleStates.RECONCILIATION_DONE :
                        req.params.operation === 'revert_to_division' ?
                          IROLifeCycleStates.REVERTED_TO_DIVISION :
                          req.params.operation === 'reopened' ?
                            IROLifeCycleStates.REOPENED :
                          // req.params.operation === 'submit' ?
                          //   IROLifeCycleStates.AMOUNT_RELEASED :
                          // req.params.operation === 'sendBack' ?
                          //   IROLifeCycleStates.IRO_SEND_BACK :
                            null,
          ...(req.params.operation === 'accountManagerApprove' ? {iroVerifiedOn: new Date(), approved: true}: null),
          ...(req.params.operation === 'rejected' ? {reasonForRejectIRO: req.body.reason, revertedBy: res.locals.authUser._id}: null),
          ...(req.params.operation === 'revert' ? {reasonForRevertIRO: req.body.reason, revertedBy: res.locals.authUser._id}: null),
          ...(req.params.operation === 'revert_to_division' ? {reasonForRevertToDivision: req.body.reason, revertedBy: res.locals.authUser._id}: null),
          ...(req.params.operation === 'officeManagerApprove' ? {reasonForRevertIRO: ''}: null),
          ...(req.params.operation === 'reconciliation_complete' ? {reconciliationOn: new Date()}: null),
          signature: updatedSignature,
        },
        {new: true},
      ).populate('division')
        .populate('FR')
        .populate('createdBy');
      console.log(iro?.division.details.coordinator?.name, 'iroooNew');
      console.log(res.locals.authUser.basicDetails.firstName, 'iroooNew');
      const designation = await Designation.findById(res.locals.authUser.supportDetails.designation);
      // cons ole.log(designation, 'iroooNewddesignation');
      const fName=res.locals.authUser.basicDetails.firstName;
      const LName =res.locals.authUser.basicDetails.lastName;
      new TransactionLog({TRNo: iro?.IROno,
        TRId: new mongoose.Types.ObjectId(req.params.IROId),
        action:
         req.params.operation === 'officeManagerApprove' ?
           'approved by office manager' :
           req.params.operation === 'accountManagerApprove' ?
             'IRO account process initiated' :
             req.params.operation === 'close' ?
               'closed' :
               req.params.operation === 'rejected' ?
                 'rejected':
                 req.params.operation === 'revert' ?
                   'reverted':
                   req.params.operation === 'reopened' ?
                     'reopened':
                     req.params.operation === 'reconciliation_complete' ?
                       'reconciliation done':
                       req.params.operation === 'revert_to_division' ?
                         'Revert to division done':
                       // req.params.operation === 'submit' ?
                       //   IROLifeCycleStates.AMOUNT_RELEASED :
                       // req.params.operation === 'sendBack' ?
                       //   IROLifeCycleStates.IRO_SEND_BACK :
                         null, type: 'IRO', doneBy: res.locals.authUser._id}).save();

      let fr;

      if (req.params.operation === 'revert_to_division') {
        new Message({
          _id: new mongoose.Types.ObjectId(),
          title: `${iro?.IROno} reverted`,
          body: `${iro?.IROno} from Division 
          ${iro?.division.details.name} has been reverted to 
          the division by ${designation?.name}, ${fName + LName}.
           Please review the reason for the revert, make
            the necessary corrections, and resend it at the earliest.`,
          division: iro?.division.details.name,
          ref_url: `${process.env.URL}/iro/${iro?._id}`,
          recipients: ({user: iro?.division.details.coordinator?.name, read: false}),
          type: 'push',
        }).save()
        // eslint-disable-next-line @typescript-eslint/no-empty-function
          .then(() => {

          }).catch((err) => {
            console.log(err);
          });
        console.log('sending message...');
        MessagingService.send('push', iro?.division.details.coordinator?.name as any, {
          title: `${iro?.IROno} reverted`,
          body: `${iro?.IROno} from Division 
          ${iro?.division.details.name} has been reverted to 
          the division by ${designation?.name}, ${fName + LName}.
           Please review the reason for the revert, make
            the necessary corrections, and resend it at the earliest.`,
          referenceURL: `${process.env.URL}/iro/${iro?._id}`,
        })
          .catch((error) => {
            console.log(error);
          });
      }
      if (req.params.operation === 'close') {
        fr = await FR.findOneAndUpdate(
          {IRO: req.params.IROId},
          {
            status: FRLifeCycleStates.FR_CLOSED,
          },
          {new: true},
        );
        new TransactionLog({TRNo: fr?.FRno, TRId: new mongoose.Types.ObjectId(fr?._id), action: 'closed', type: 'FR', doneBy: res.locals.authUser._id}).save();
      } else if (req.params.operation === 'rejected') {
        fr = await FR.findOneAndUpdate(
          {IRO: req.params.IROId},
          {
            status: FRLifeCycleStates.REJECTED,
          },
          {new: true},
        );
        new TransactionLog({TRNo: fr?.FRno, TRId: new mongoose.Types.ObjectId(fr?._id), action: 'rejected', type: 'FR', doneBy: res.locals.authUser._id}).save();
      } else if (req.params.operation === 'revert') {
        const fr = await GroupedIRO.findOneAndDelete({IRO: req.params.IROId});
      }


      // if the Reconsillation IRO is closed then FR Status will be also closed
      if (req.params.operation === 'rejected') {
        const frs= await FR.findOneAndUpdate(
          {IRO: req.params.IROId},
          {
            status: FRLifeCycleStates.IRO_REJECTED,
          },
          {new: true},
        );
        console.log(frs, '6565');
      }
      if (!iro) {
        return next(new Error('IRO ID Not found'));
      }
      if (!fr && req.params.operation === 'close') {
        return next(new Error('FR ID Not found'));
      }

      sendStandardResponse(res, 'OK', {
        data: {iro: iro, fr: fr},
        message: `Successfully ${req.params.operation}d IRO`,
      });
      if (req.params.operation === 'reconciliation_complete') {
        IROEvents.emit('reconciliation_complete', {data: iro});
      } else {
        IROEvents.emit('approve', {data: {newIRO: iro, status: req.params.operation}});
      }
      //  else if (req.params.operation === 'approve'){
      //   staffEvents.emit('approve', staff);
      // }else {
      //   staffEvents.emit('deactivate', staff);
      // }
    } catch (error) {
      next(error);
    }
  },
);


IRORouter.delete('/:IroID/force', authCheck(['ADMIN_ACCESS']), async (req, res, next) => {
  try {
    console.log('call came');
    const iros: any = await IRO.findOneAndDelete({_id: req.params.IroID});
    console.log('iros?.status', iros?.status);
    if (iros?.status == IROLifeCycleStates.WAITING_FOR_ACCOUNTS_STATE) {
      const countDocument = await Counts.findOne({});
      await Counts.updateOne(
        {},
        {$set: {IRAppliedCount: (Number(countDocument?.IRAppliedCount) || 0) - 1}},
      );
      console.log('count updates', countDocument);
    }
    new TransactionLog({
      TRNo: iros?.IROno?? 0,
      TRId: new mongoose.Types.ObjectId(req.params.IroID),
      action: 'Deleted',
      type: 'IRO',
      doneBy: res.locals.authUser._id,
    }).save();
    if (!IROEvents) {
      return next(new Error('Iro ID Not found'));
    }
    sendStandardResponse(res, 'OK', {
      data: iros,
      message: 'Successfully force deleted IRO',
    });
  } catch (error) {
    next(error);
  }
});
IRORouter.delete('/:IroID/CustomForce', authCheck(['ADMIN_ACCESS']), async (req, res, next) => {
  try {
    console.log('call came');
    const iros: any = await CustomIRO.findOneAndDelete({_id: req.params.IroID});
    console.log('iros?.status', iros?.status);
    if (iros?.status == IROLifeCycleStates.WAITING_FOR_ACCOUNTS_STATE) {
      const countDocument = await Counts.findOne({});
      await Counts.updateOne(
        {},
        {$set: {IRAppliedCount: (Number(countDocument?.IRAppliedCount) || 0) - 1}},
      );
      console.log('count updates', countDocument);
    }
    new TransactionLog({
      TRNo: iros?.IROno?? 0,
      TRId: new mongoose.Types.ObjectId(req.params.IroID),
      action: 'Deleted',
      type: 'IRO',
      doneBy: res.locals.authUser._id,
    }).save();
    if (!IROEvents) {
      return next(new Error('Iro ID Not found'));
    }
    sendStandardResponse(res, 'OK', {
      data: iros,
      message: 'Successfully force deleted IRO',
    });
  } catch (error) {
    next(error);
  }
});

export default IRORouter;
