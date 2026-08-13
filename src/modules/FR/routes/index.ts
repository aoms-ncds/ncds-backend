/* eslint-disable max-len */
import {Router} from 'express';
import authCheck from '../../../extras/auth_check';
import {sendStandardResponse} from '../../../extras/helpers';
import FR, {IFR} from '../models/FR';
import FRLifeCycleStates from '../extras/FRLifeCycleStates';
import FREvents from '../events/FR_events';
import particularsRouter from './particulars';
import Remarks, {IRemark} from '../models/remarks';
import remarkEvents from '../events/remarks_event';
import {FormattedCode} from '../../../models/FormattedCode';
import mongoose from 'mongoose';
import IRO from '../../IRO/models/IRO';
import moment, {Moment} from 'moment';
import MainCategory from '../models/category';
import IROLifeCycleStates from '../../IRO/extras/IROLifeCycleStates';
import Message from '../../../models/Messages';
import User from '../../users/models/User';
import MessagingService from '../../../extras/Messaging';
import {IUser} from '../../users/extras/user_types';
import CommonLifeCycleStates from '../../../extras/CommonLifeCycleStates';
import TransactionLog, {ITransactionLog} from '../models/transactionLog';
import Mailer from '../../../extras/Mailer';
import esignature from '../../settings/models/esignature';
import Division from '../../divisions/models/Division';
import CustomFR from '../models/CustomFR';
import {log} from 'console';
import {ObjectId} from 'mongodb';

interface DateRange {
  startDate: Moment;
  endDate: Moment;
}

const FRRouter = Router();
FRRouter.use('/particulars', particularsRouter);
/**
 * For getting a count of all FR
 * [GET] /fr/count
 * [GET] /fr/count?status=0 - For getting list of all inactive FR
 * [GET] /fr/count?status=1 - For getting list of all active FR
 * [GET] /fr/count?status=-1 - For getting list of all deleted FR
 *
 * @author <annmariya@computervalley.online>, <@annmariyacomputervalley>
 *
 * 📘
 */
FRRouter.get('/count', authCheck(['READ_ACCESS']), async (req, res, next) => {
  try {
    const conditions: any = {};

    console.log(req.query.year, 'ewwe');

    if (Object.keys(req.query).includes('status')) {
      conditions.status = Number(req.query.status);
    }

    if (Object.keys(req.query).includes('isCustom')) {
      conditions.isCustom = req.query.isReSubmitted === 'true';
    }

    // Financial Year Filter
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

    if (res.locals.authUser.kind == 'worker') {
      conditions.division = res.locals.authUser.division;
    }

    sendStandardResponse<number>(res, 'OK', {
      data: await FR.countDocuments(conditions),
      message: 'Successfully fetched list of FR',
    });
  } catch (error) {
    next(error);
  }
});
FRRouter.get('/ReSubmittedCount', authCheck(['READ_ACCESS']), async (req, res, next) => {
  try {
    const conditions: any = {};
    console.log(req.query.isReSubmitted, 'ewwe');

    // Status filter
    if (Object.keys(req.query).includes('status')) {
      conditions.status = Number(req.query.status);
    }

    // isCustom filter
    if (Object.keys(req.query).includes('isCustom')) {
      conditions.isCustom = req.query.isReSubmitted === 'true';
    }

    // Financial Year filter
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

    // Worker division restriction
    if (res.locals.authUser.kind == 'worker') {
      conditions.division = res.locals.authUser.division;
    }

    sendStandardResponse<number>(res, 'OK', {
      data: await CustomFR.countDocuments(conditions),
      message: 'Successfully fetched list of Custom FR',
    });
  } catch (error) {
    next(error);
  }
});

/*
 * For getting a list of all staffs
 * [GET] /fr/
 * [GET] /fr?status=0 - For getting list of all inactive staffs
 * [GET] /fr?status=1 - For getting list of all active staffs
 * [GET] /fr?status=-1 - For getting list of all deleted staffs
 *
 * @author <annmariya@computervalley.online>, <@annmariya>
 *
 * 📘
 */
FRRouter.get('/', authCheck(['READ_FR']), async (req, res, next) => {
  try {
    let condition: mongoose.FilterQuery<IFR> = {};

    if (Object.keys(req.query).includes('status') && (req.query?.status as string[])?.length > 0) {
      condition = {...condition, status: {$in: (req.query.status as string[])?.map((stat) => Number(stat))}};
    }
    console.log(req.query?.dateRange, 'condition2');

    if (Object.keys(req.query).includes('dateRange')) {
      condition = {
        ...condition,
        FRdate: {
          $gt: moment.utc((req.query?.dateRange as unknown as DateRange)?.startDate).startOf('D').toDate(),
          $lt: moment.utc((req.query?.dateRange as unknown as DateRange)?.endDate).endOf('D').toDate(),
        },
      };
    }
    if (Object.keys(req.query).includes('support')) {
      if (req.query.support === 'worker') {
        condition = {...condition, workerSupport: true};
      } else if (req.query.support === 'child') {
        condition = {...condition, childSupport: true};
      } else {
        condition = {...condition, $or: [{workerSupport: true}, {childSupport: true}]};
      }
    }

    if (res.locals.authUser.kind == 'worker') {
      condition = {
        ...condition,
        division: res.locals.authUser.division,
      };
    }
    // console.log(res.locals.authUser._id, 'condition3');
    // const users= await User.findById(res.locals.authUser._id).populate('supportDetails.designation');
    // console.log(users?.supportDetails.designation?.name, 'condition3');
    // console.log(res.locals.authUser.permissions);
    // if (!res.locals.authUser.permissions.PRESIDENT_ACCESS == true && !Object.keys(req.query).includes('status')) {
    //   condition = {...condition, status: {$ne: (FRLifeCycleStates.WAITING_FOR_PRESIDENT)}};
    // }
    // if (users?.supportDetails.designation?.name =='Coordinator' || users?.supportDetails.designation?.name =='Officiating Co-Ordinator' &&!Object.keys(req.query).includes('status')) {
    //   // eslint-disable-next-line max-len
    //   condition ={...condition, status: {$in: [FRLifeCycleStates.WAITING_FOR_PRESIDENT, FRLifeCycleStates.WAITING_FOR_ACCOUNTS, FRLifeCycleStates.FR_SEND_BACK, FRLifeCycleStates.REJECTED, FRLifeCycleStates.FR_APPROVED]}};
    // }

    sendStandardResponse<IFR[]>(res, 'OK', {
      data: await FR.find(condition)
        .sort({createdAt: 'desc'})
        .populate('particulars')
        .populate('purposeSubdivision')
        .populate('additionalSignature')
        .populate('division')
        .populate('purposeCoordinator')
        .populate('purposeWorker')
        .populate('workerName')
        .populate('revertedBy')
        .populate({
          path: 'division',
          populate: [
            {path: 'details.coordinator.sign', model: 'files'},
            {path: 'details.prevCoordinator.sign', model: 'files'},
            {path: 'details.prevJuniorLeader1.sign', model: 'files'},
            {path: 'details.prevJuniorLeader2.sign', model: 'files'},
            {path: 'details.coordinator.name', model: 'users'},
            {path: 'details.additionalJuniorLeader.sign', model: 'files'},
            {path: 'details.additionalSeniorLeader.sign', model: 'files'},
          ],
        })
        .populate({
          path: 'signature',
          populate: {
            path: 'coordinator',
            model: 'users',
          },
        })
        .populate({
          path: 'signature',
          populate: {
            path: 'jrLeader',
            model: 'files',
          },
        })
        .populate({
          path: 'signature',
          populate: {
            path: 'srLeader',
            model: 'files',
          },
        })
        .populate({
          path: 'signature',
          populate: {
            path: 'president',
            model: 'files',
          },
        })
        .populate({
          path: 'signature',
          populate: {
            path: 'officeMgr',
            model: 'files',
          },
        })
        .populate({
          path: 'names',
          populate: {
            path: 'coordinator',
            model: 'users',
          },
        })
        .populate({
          path: 'names',
          populate: {
            path: 'jrLeader',
            model: 'users',
          },
        })
        .populate({
          path: 'names',
          populate: {
            path: 'srLeader',
            model: 'users',
          },
        })
        .populate({
          path: 'division',
          populate: {
            path: 'details.seniorLeader.sign',
            model: 'files',
          },
        })
        .populate({
          path: 'division',
          populate: {
            path: 'details.seniorLeader.name',
            model: 'users',
          },
        })
        .populate({
          path: 'division',
          populate: {
            path: 'details.juniorLeader.sign',
            model: 'files',
          },
        })
        .populate({
          path: 'division',
          populate: {
            path: 'details.juniorLeader.name',
            model: 'users',
          },
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
        .populate({
          path: 'division',
          populate: {
            path: 'details.officeManager.sign',
            model: 'files',
          },
        })
        .populate({
          path: 'division',
          populate: {
            path: 'details.officeManager.name',
            model: 'users',
          },
        })
        .populate({
          path: 'particulars',
          populate: {
            path: 'attachment',
            model: 'files',
          },
        }),
      message: 'Successfully fetched list of FR',
    });
  } catch (error) {
    next(error);
  }
});
FRRouter.get('/optimized', authCheck(['READ_FR']), async (req, res, next) => {
  try {
    let condition: mongoose.FilterQuery<IFR> = {};

    if (Object.keys(req.query).includes('status') && (req.query?.status as string[])?.length > 0) {
      condition = {...condition, status: {$in: (req.query.status as string[])?.map((stat) => Number(stat))}};
    }
    console.log(req.query, 'condition2');

    if (Object.keys(req.query).includes('dateRange')) {
      condition = {
        ...condition,
        FRdate: {
          $gt: moment.utc((req.query?.dateRange as unknown as DateRange)?.startDate).startOf('D').toDate(),
          $lt: moment.utc((req.query?.dateRange as unknown as DateRange)?.endDate).endOf('D').toDate(),
        },
      };
    }
    if (Object.keys(req.query).includes('support')) {
      if (req.query.support === 'worker') {
        condition = {...condition, workerSupport: true};
      } else if (req.query.support === 'child') {
        condition = {...condition, childSupport: true};
      } else {
        condition = {...condition, $or: [{workerSupport: true}, {childSupport: true}]};
      }
    }

    if (res.locals.authUser.kind == 'worker') {
      condition = {
        ...condition,
        division: res.locals.authUser.division,
      };
    }
    // console.log(res.locals.authUser._id, 'condition3');
    // const users= await User.findById(res.locals.authUser._id).populate('supportDetails.designation');
    // console.log(users?.supportDetails.designation?.name, 'condition3');
    // console.log(res.locals.authUser.permissions);
    if (!res.locals.authUser.permissions.PRESIDENT_ACCESS == true && !Object.keys(req.query).includes('status')) {
      condition = {...condition, status: {$ne: (FRLifeCycleStates.WAITING_FOR_PRESIDENT)}};
    }
    // if (users?.supportDetails.designation?.name =='Coordinator' || users?.supportDetails.designation?.name =='Officiating Co-Ordinator' &&!Object.keys(req.query).includes('status')) {
    //   // eslint-disable-next-line max-len
    //   condition ={...condition, status: {$in: [FRLifeCycleStates.WAITING_FOR_PRESIDENT, FRLifeCycleStates.WAITING_FOR_ACCOUNTS, FRLifeCycleStates.FR_SEND_BACK, FRLifeCycleStates.REJECTED, FRLifeCycleStates.FR_APPROVED]}};
    // }

    sendStandardResponse<IFR[]>(res, 'OK', {
      data: await FR.find(condition)
        .sort({createdAt: 'desc'})
        .populate('particulars')
        .populate('purposeSubdivision')
        .populate('additionalSignature')
        .populate('division')
        .populate('purposeCoordinator')
        .populate('purposeWorker')
        .populate('revertedBy'),
      message: 'Successfully fetched list of FR',
    });
  } catch (error) {
    next(error);
  }
});
FRRouter.get('/support-expanse/', authCheck(['READ_FR']), async (req, res, next) => {
  try {
    let condition: mongoose.FilterQuery<IFR> = {};

    console.log(req.query.support, 'req.44');
    if (Object.keys(req.query).includes('dateRange')) {
      condition = {
        ...condition,
        FRdate: {
          $gt: moment.utc((req.query?.dateRange as unknown as DateRange)?.startDate).startOf('D').toDate(),
          $lt: moment.utc((req.query?.dateRange as unknown as DateRange)?.endDate).endOf('D').toDate(),
        },
      };
    }
    if (Object.keys(req.query).includes('status') && (req.query?.status as string[])?.length > 0) {
      condition = {...condition, status: {$in: (req.query.status as string[])?.map((stat) => Number(stat))}};
    }
    if (req.query.support) {
      if (req.query.support === 'Expanse') {
        condition = {
          ...condition,
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
        condition = {
          ...condition,
          $or: [{workerSupport: true}, {childSupport: true}],
        };
      } else if (req.query.support=='Resubmitted') {
        condition = {
          ...condition,
          $or: [{isReverted: true}],
          status: [FRLifeCycleStates.WAITING_FOR_ACCOUNTS, FRLifeCycleStates.WAITING_FOR_PRESIDENT],
        };
      }
    } else if (req.query.support=='Custom') {
      condition = {
        ...condition,
        isCustom: true,
      };
    }


    if (res.locals.authUser.kind == 'worker') {
      condition = {
        ...condition,
        division: res.locals.authUser.division,
      };
    }

    sendStandardResponse<IFR[]>(res, 'OK', {
      data: req.query.support == 'Custom' ? await CustomFR.find(condition).sort({createdAt: 'desc'})
        .populate('particulars')
        .populate('purposeSubdivision')
        .populate('additionalSignature')
        .populate('division')
        .populate('purposeCoordinator')
        .populate('purposeWorker') : await FR.find(condition)
        .sort({createdAt: 'desc'})
        .populate('particulars')
        .populate('purposeSubdivision')
        .populate('additionalSignature')
        .populate('division')
        .populate('purposeCoordinator')
        .populate('purposeWorker'),
      message: 'Successfully fetched list of FR',
    });
  } catch (error) {
    next(error);
  }
});
FRRouter.get('/optimizedForDiv', authCheck(['READ_FR']), async (req, res, next) => {
  try {
    let condition: mongoose.FilterQuery<IFR> = {};

    if (Object.keys(req.query).includes('status') && (req.query?.status as string[])?.length > 0) {
      condition = {...condition, status: {$in: (req.query.status as string[])?.map((stat) => Number(stat))}};
    }
    console.log(req.query, 'condition2');

    if (Object.keys(req.query).includes('dateRange')) {
      condition = {
        ...condition,
        FRdate: {
          $gt: moment.utc((req.query?.dateRange as unknown as DateRange)?.startDate).startOf('D').toDate(),
          $lt: moment.utc((req.query?.dateRange as unknown as DateRange)?.endDate).endOf('D').toDate(),
        },
      };
    }
    if (Object.keys(req.query).includes('support')) {
      if (req.query.support === 'worker') {
        condition = {...condition, workerSupport: true};
      } else if (req.query.support === 'child') {
        condition = {...condition, childSupport: true};
      } else {
        condition = {...condition, $or: [{workerSupport: true}, {childSupport: true}]};
      }
    }

    if (res.locals.authUser.kind == 'worker') {
      condition = {
        ...condition,
        division: res.locals.authUser.division,
      };
    }
    // console.log(res.locals.authUser._id, 'condition3');
    // const users= await User.findById(res.locals.authUser._id).populate('supportDetails.designation');
    // console.log(users?.supportDetails.designation?.name, 'condition3');
    // console.log(res.locals.authUser.permissions);
    // if (!res.locals.authUser.permissions.PRESIDENT_ACCESS == true && !Object.keys(req.query).includes('status')) {
    //   condition = {...condition, status: {$ne: (FRLifeCycleStates.WAITING_FOR_PRESIDENT)}};
    // }
    // if (users?.supportDetails.designation?.name =='Coordinator' || users?.supportDetails.designation?.name =='Officiating Co-Ordinator' &&!Object.keys(req.query).includes('status')) {
    //   // eslint-disable-next-line max-len
    //   condition ={...condition, status: {$in: [FRLifeCycleStates.WAITING_FOR_PRESIDENT, FRLifeCycleStates.WAITING_FOR_ACCOUNTS, FRLifeCycleStates.FR_SEND_BACK, FRLifeCycleStates.REJECTED, FRLifeCycleStates.FR_APPROVED]}};
    // }

    sendStandardResponse<IFR[]>(res, 'OK', {
      data: await FR.find(condition)
        .sort({createdAt: 'desc'})
        .populate('particulars')
        .populate('purposeSubdivision')
        .populate('additionalSignature')
        .populate('division')
        .populate('purposeCoordinator')
        .populate('purposeWorker')
        .populate('revertedBy'),
      message: 'Successfully fetched list of FR',
    });
  } catch (error) {
    next(error);
  }
});

FRRouter.get('/custom', authCheck(['READ_FR']), async (req, res, next) => {
  try {
    let condition: mongoose.FilterQuery<IFR> = {};

    if (Object.keys(req.query).includes('status') && (req.query?.status as string[])?.length > 0) {
      condition = {...condition, status: {$in: (req.query.status as string[])?.map((stat) => Number(stat))}};
    }
    console.log(condition, 'condition2');

    if (Object.keys(req.query).includes('dateRange')) {
      condition = {
        ...condition,
        FRdate: {
          $gt: moment.utc((req.query?.dateRange as unknown as DateRange)?.startDate).startOf('D').toDate(),
          $lt: moment.utc((req.query?.dateRange as unknown as DateRange)?.endDate).endOf('D').toDate(),
        },
      };
    }
    if (Object.keys(req.query).includes('support')) {
      if (req.query.support === 'worker') {
        condition = {...condition, workerSupport: true};
      } else if (req.query.support === 'child') {
        condition = {...condition, childSupport: true};
      } else {
        condition = {...condition, $or: [{workerSupport: true}, {childSupport: true}]};
      }
    }

    if (res.locals.authUser.kind == 'worker') {
      condition = {
        ...condition,
        division: res.locals.authUser.division,
      };
    }
    // console.log(res.locals.authUser._id, 'condition3');
    // const users= await User.findById(res.locals.authUser._id).populate('supportDetails.designation');
    // console.log(users?.supportDetails.designation?.name, 'condition3');
    // console.log(res.locals.authUser.permissions);
    if (!res.locals.authUser.permissions.PRESIDENT_ACCESS == true && !Object.keys(req.query).includes('status')) {
      condition = {...condition, status: {$ne: (FRLifeCycleStates.WAITING_FOR_PRESIDENT)}};
    }
    // if (users?.supportDetails.designation?.name =='Coordinator' || users?.supportDetails.designation?.name =='Officiating Co-Ordinator' &&!Object.keys(req.query).includes('status')) {
    //   // eslint-disable-next-line max-len
    //   condition ={...condition, status: {$in: [FRLifeCycleStates.WAITING_FOR_PRESIDENT, FRLifeCycleStates.WAITING_FOR_ACCOUNTS, FRLifeCycleStates.FR_SEND_BACK, FRLifeCycleStates.REJECTED, FRLifeCycleStates.FR_APPROVED]}};
    // }

    sendStandardResponse<IFR[]>(res, 'OK', {
      data: await CustomFR.find(condition)
        .sort({createdAt: 'desc'})
        .populate('particulars')
        .populate('purposeSubdivision')
        .populate('additionalSignature')
        .populate('division')
        .populate('purposeCoordinator')
        .populate('purposeWorker')
        .populate('CoordinatorSign')
        .populate('jrLeaderSign')
        .populate('presidentSign')
        .populate('srLeaderSign')
        .populate({
          path: 'division',
          populate: [
            {path: 'details.coordinator.sign', model: 'files'},
            {path: 'details.additionalJuniorLeader.sign', model: 'files'},
            {path: 'details.additionalSeniorLeader.sign', model: 'files'},
          ],
        })
        .populate({
          path: 'division',
          populate: {
            path: 'details.seniorLeader.sign',
            model: 'files',
          },
        })
        .populate({
          path: 'division',
          populate: {
            path: 'details.seniorLeader.name',
            model: 'users',
          },
        })
        .populate({
          path: 'division',
          populate: {
            path: 'details.juniorLeader.sign',
            model: 'files',
          },
        })
        .populate({
          path: 'division',
          populate: {
            path: 'details.juniorLeader.name',
            model: 'users',
          },
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
        .populate({
          path: 'division',
          populate: {
            path: 'details.officeManager.sign',
            model: 'files',
          },
        })
        .populate({
          path: 'division',
          populate: {
            path: 'details.officeManager.name',
            model: 'users',
          },
        })
        .populate({
          path: 'particulars',
          populate: {
            path: 'attachment',
            model: 'files',
          },
        }),
      message: 'Successfully fetched list of FR',
    });
  } catch (error) {
    next(error);
  }
});

FRRouter.get('/forDivision', authCheck(['READ_FR']), async (req, res, next) => {
  try {
    let condition: mongoose.FilterQuery<IFR> = {};

    if (Object.keys(req.query).includes('status') && (req.query?.status as string[])?.length > 0) {
      condition = {...condition, status: {$in: (req.query.status as string[])?.map((stat) => Number(stat))}};
    }
    console.log(condition, 'condition2');

    if (Object.keys(req.query).includes('dateRange')) {
      condition = {
        ...condition,
        FRdate: {
          $gt: moment((req.query?.dateRange as unknown as DateRange)?.startDate).startOf('D').toDate(),
          $lt: moment((req.query?.dateRange as unknown as DateRange)?.endDate).endOf('D').toDate(),
        },
      };
    }

    if (res.locals.authUser.kind == 'worker') {
      condition = {
        ...condition,
        division: res.locals.authUser.division,
      };
    }
    // if (!res.locals.authUser.permissions.PRESIDENT_ACCESS ==true &&!Object.keys(req.query).includes('status')) {
    //   condition ={...condition, status: {$ne: (FRLifeCycleStates.WAITING_FOR_PRESIDENT)}};
    // }
    // if (users?.supportDetails.designation?.name =='Coordinator' || users?.supportDetails.designation?.name =='Officiating Co-Ordinator' &&!Object.keys(req.query).includes('status')) {
    //   // eslint-disable-next-line max-len
    //   condition ={...condition, status: {$in: [FRLifeCycleStates.WAITING_FOR_PRESIDENT, FRLifeCycleStates.WAITING_FOR_ACCOUNTS, FRLifeCycleStates.FR_SEND_BACK, FRLifeCycleStates.REJECTED, FRLifeCycleStates.FR_APPROVED]}};
    // }

    sendStandardResponse<IFR[]>(res, 'OK', {
      data: await FR.find(condition)
        .sort({createdAt: 'desc'})
        .populate('particulars')
        .populate('purposeSubdivision')
        .populate('additionalSignature')
        .populate('division')
        .populate('purposeCoordinator')
        .populate('purposeWorker')
        .populate({
          path: 'division',
          populate: [
            {path: 'details.coordinator.sign', model: 'files'},
            {path: 'details.coordinator.name', model: 'users'},
            {path: 'details.additionalJuniorLeader.sign', model: 'files'},
            {path: 'details.additionalSeniorLeader.sign', model: 'files'},
          ],
        })
        .populate({
          path: 'division',
          populate: {
            path: 'details.seniorLeader.sign',
            model: 'files',
          },
        })
        .populate({
          path: 'division',
          populate: {
            path: 'details.seniorLeader.name',
            model: 'users',
          },
        })
        .populate({
          path: 'division',
          populate: {
            path: 'details.juniorLeader.sign',
            model: 'files',
          },
        })
        .populate({
          path: 'division',
          populate: {
            path: 'details.juniorLeader.name',
            model: 'users',
          },
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
        .populate({
          path: 'division',
          populate: {
            path: 'details.officeManager.sign',
            model: 'files',
          },
        })
        .populate({
          path: 'division',
          populate: {
            path: 'details.officeManager.name',
            model: 'users',
          },
        })
        .populate({
          path: 'particulars',
          populate: {
            path: 'attachment',
            model: 'files',
          },
        }),
      message: 'Successfully fetched list of FR',
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
FRRouter.post('/', authCheck(['WRITE_FR']), async (req, res, next) => {
  try {
    console.log(res.locals.authUser.division, 'Shibind88');
    const divs= await Division.findById(res.locals.authUser.division);
    const delhiDiv= await Division.findById('658270549efadc163550a28c');
    console.log(delhiDiv, 'delhiDiv');

    // console.log(divs?.details.coordinator?.sign, 'popo');
    // console.log(divs?.details?.coordinator?.name, 'popo');
    const eSign= await esignature.find({});

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // JavaScript months are 0-based, so add 1

    const lastTwoDigits = currentYear.toString().slice(-2);
    const aprilYearPrefix = `FRN${lastTwoDigits}N`; // ✅ FIXED
    const prevYear = currentYear - 1;
    const lastTwoDigitsLastYear = prevYear.toString().slice(-2);
    const aprilYearPrefixLastYear = `FRN${lastTwoDigitsLastYear}N`; // ✅ FIXED
    let counter = await FormattedCode.findOne({year: currentYear});
    let FRno;
    // If no record exists for the current year OR it's April, reset FRCode
    if (currentMonth >=4) {
      if (!counter && currentMonth === 4) {
        counter = await FormattedCode.findOneAndUpdate(
          {year: currentYear}, // Ensure year match
          {$set: {FRCode: 1, year: currentYear}}, // Reset FRCode to 1
          {new: true, upsert: true},
        );
        const formattedCode = counter?.FRCode.toString().padStart(4, '0');

        // Final formatted FR number
        FRno = `${aprilYearPrefix}${formattedCode}`;
      } else {
        // Increment FRCode for existing year
        counter = await FormattedCode.findOneAndUpdate(
          {year: currentYear},
          {$inc: {FRCode: 1}},
          {new: true},
        );
        const formattedCode = counter?.FRCode.toString().padStart(4, '0');

        // Final formatted FR number
        FRno = `${aprilYearPrefix}${formattedCode}`;
        // FRno='FRN' +
        // (
        //   counter = await FormattedCode.findOneAndUpdate(
        //     {},
        //     {$inc: {FRCode: 1}},
        //     {new: true},
        //   )
        // )?.FRCode.toString().padStart(4, '0');
      }
    } else {
      // if (currentYear == (currentYear-1)) {//2025
      //   FRno ='FRN' +
      //   (
      //     await FormattedCode.findOneAndUpdate(
      //       {},
      //       {$inc: {FRCode: 1}},
      //       {new: true},
      //     )
      //   )?.FRCode.toString().padStart(4, '0');
      // }

      // Increment FRCode for existing year
      counter = await FormattedCode.findOneAndUpdate(
        {year: prevYear},
        {$inc: {FRCode: 1}},
        {new: true},
      );
      const formattedCode = counter?.FRCode.toString().padStart(4, '0');

      // Final formatted FR number
      FRno = `${aprilYearPrefixLastYear}${formattedCode}`;
    }

    // Format FRCode as a four-digit number (e.g., 0001, 0002)

    console.log(FRno, 'p0000'); // Example output: "FR25N0001"
    // FRno ='FRN' +
    // (
    //   await FormattedCode.findOneAndUpdate(
    //     {},
    //     {$inc: {FRCode: 1}},
    //     {new: true},
    //   )
    // )?.FRCode.toString().padStart(4, '0');

    const FRId = new mongoose.Types.ObjectId();
    const fr = new FR({
      ...req.body,
      createdBy: res.locals.authUser._id,
      division: req.body.division ?? res.locals.authUser.division,
      specialsanction: 'No',
      purposeWorker: req.body?.purposeWorker?._id,
      FRno: FRno,
      _id: FRId,
      signature: {
        coordinator: divs?.details?.coordinator?.name,
        jrLeader: divs?.details?.juniorLeader?.name,
        srLeader: divs?.details?.seniorLeader?.name,
        president: eSign[0]?.presidentSignature,
        // officeMgr: eSign[0]?.officeManagerSignature,
      },
      signatureCustom: {
        jrLeaderCustom: divs?.details?.additionalJuniorLeader?.name,
        srLeaderCustom: divs?.details?.additionalSeniorLeader?.name,
      },
      signatureDelhiDiv: {
        jrLeader: delhiDiv?.details?.juniorLeader?.name,
        srLeader: delhiDiv?.details?.seniorLeader?.name,
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
    new TransactionLog({TRNo: FRno, TRId: FRId, action: 'created', type: 'FR', doneBy: res.locals.authUser._id}).save();
    sendStandardResponse(res, 'OK', {
      data: fr,
      message: 'Successfully added new FR',
    });
    FREvents.emit('create', {data: fr, initiator: res.locals.authUser});
  } catch (error) {
    next(error);
  }
});
FRRouter.post('/custom', authCheck(['WRITE_FR']), async (req, res, next) => {
  try {
    console.log(req.body?.FRno, 'Shibind88');
    console.log(req.body.CoordinatorSign?._id, 'Shibind8iiid');
    const CusIRO= await CustomFR.findOne({FRno: `FRN${req.body.FRno}`});
    const CusFR= await FR.findOne({FRno: `FRN${req.body.FRno}`});
    console.log(CusFR, 'CusFR');

    if (CusIRO) {
      return sendStandardResponse(res, 'BAD REQUEST', {
        data: 'Custom FRNo already exists',
        message: 'FRNo already exists',
      });
    }
    if ( CusFR) {
      return sendStandardResponse(res, 'BAD REQUEST', {
        data: 'FRNo already exists',
        message: 'FRNo already exists',
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
    const fr = new CustomFR({
      ...req.body,
      isPresident: req.body?.isPresident,
      isCustom: true,
      PresidentApprovedDate: req.body?.presidentSanctionDate,
      createdBy: res.locals.authUser._id,
      division: req.body.division ?? res.locals.authUser.division,
      specialsanction: req.body.isPresident ? 'Yes' : 'No',
      beneficiaryName: req.body?.beneficiaryName,
      sanctionedAsPer: req.body?.sanctionedAsPer,
      sanctionedAmount: req.body?.sanctionedAmount,
      purposeWorker: req.body?.purposeWorker?._id,
      FRno: `FRN${req.body.FRno}`,
      kind: req.body.kind,
      _id: FRId,
      signature: {
        coordinator: req.body.CoordinatorSign?.[0]?._id,
        jrLeader: req.body.jrLeaderSign?.[0]?._id, // 👈 FIXED casing
        srLeader: req.body.srLeaderSign?.[0]?._id,
        president: req.body.presidentSign?.[0]?._id,
      },
      names: {
        coordinator: req.body.coordinatorName,
        jrLeader: req.body.jrLeaderName,
        srLeader: req.body.srLeaderName,
        president: req.body.presidentName,
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
    new TransactionLog({TRNo: FRno, TRId: FRId, action: 'created', type: 'FR', doneBy: res.locals.authUser._id}).save();
    sendStandardResponse(res, 'OK', {
      data: fr,
      message: 'Successfully added new FR',
    });
    FREvents.emit('create', {data: fr, initiator: res.locals.authUser});
  } catch (error) {
    next(error);
  }
});

FRRouter.post(
  '/remarks',
  authCheck([]),
  async (req, res, next) => {
    try {
      const remark = new Remarks({
        ...req.body,
        createdBy: res.locals.authUser._id,
        status: CommonLifeCycleStates.ACTIVE,
      });
      await remark.validate();
      sendStandardResponse(res, 'OK', {
        data: await Remarks.populate(await remark.save(), 'createdBy'),
        message: 'Successfully added new Remarks',
      });
      remarkEvents.emit('create', {data: remark, initiator: res.locals.authUser});
    } catch (error) {
      next(error);
    }
  },
);

FRRouter.get('/category', authCheck([]), async (req, res) => {
  try {
    const category = await MainCategory.find();

    sendStandardResponse(res, 'OK', {
      data: category,
      message: 'Successfully fetched Category',
    });
  } catch (error) {
    console.log(error);
  }
});

FRRouter.get(
  '/remarks/:FRId',
  authCheck([]),
  async (req, res, next) => {
    try {
      sendStandardResponse<IRemark[]>(res, 'OK', {
        data: await Remarks.find({FR: req.params.FRId}).populate('createdBy'),
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
 * @author <madhuhsmadhu18@gmail.com>, <@madhu.h.s>
 *
 * ✍🏻👉📤
 */
FRRouter.post('/sent/:name/:id',
  authCheck(['READ_FR']),
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async (req, res) => {
    User.aggregate([
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
                  then: {$in: [true, '$permissions.MANAGE_FR']},
                  else: false,
                },
              },
            },
            // 'permissions.PRESIDENT_ACCESS': true,
          },
        },
      },
    ])
      .exec()
      .then(async (usersWithWriteAccessToAccounts: IUser[]) => {
        // console.log(usersWithWriteAccesssToBudgetCode);
        let userIds = usersWithWriteAccessToAccounts.map((user) => {
          return user._id;
        });
        const fr = await FR.findById(req.params.id).populate('division');
        if (req.params.name == 'division_head') {
          userIds = [fr?.division?.details.coordinator?.name];
          // console.log(await IRO.findById(req.params.id).then((res)=>res?.createdBy), 'createdBy');
        }


        new Message({
          _id: new mongoose.Types.ObjectId(),
          title: 'Please check the FR',
          body: 'Evaluate the FR and Mark your remarks',
          division: fr?.division.details.name.trim(),
          ref_url: `http://aoms.ietapps.org/fr/${req.params.id}/view`,
          recipients: userIds.map((item) => ({user: item, read: false})),
          type: 'push',
        }).save()
          .then((result) => {
            sendStandardResponse(res, 'OK', {
              message: 'Message sent Successfully ',
            });
            console.log(result);
          }).catch((err) => {
            console.log(err);
          });
        console.log('sending message...');
        MessagingService.send('push', userIds, {
          title: 'Please check the FR',
          body: 'Evaluate the FR and Mark your remarks',
          referenceURL: `http://aoms.ietapps.org/fr/${req.params.id}/view`,
        })
          .catch((error) => {
            console.log(error);
          });
      })
      .catch((error) => {
        console.log(error);
      });
  });
/**
 * For Get  a FR by Id
 * [GET] /fr/{FR id}
 *
 * @author <annmariya@computervalley.online>, <@annmariya>
 *
 * ✍🏻
 */
FRRouter.get('/:FRId', authCheck(['READ_FR']), async (req, res, next) => {
  try {
    sendStandardResponse<IFR | null>(res, 'OK', {
      data: await FR.findById(req.params.FRId)
        .populate('purposeSubdivision')
        .populate('division')
        .populate('additionalSignature')
        .populate('purposeCoordinator')
        .populate('purposeWorker')
        .populate('particulars')
        .populate('workerName')
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
        })

        .populate({
          path: 'signature',
          populate: {
            path: 'coordinator',
            model: 'users',
          },
        })
        .populate({
          path: 'signature',
          populate: {
            path: 'jrLeader',
            model: 'files',
          },
        })
        .populate({
          path: 'signature',
          populate: {
            path: 'srLeader',
            model: 'files',
          },
        })
        .populate({
          path: 'signature',
          populate: {
            path: 'president',
            model: 'files',
          },
        })
        .populate({
          path: 'names',
          populate: {
            path: 'coordinator',
            model: 'users',
          },
        })
        .populate({
          path: 'names',
          populate: {
            path: 'jrLeader',
            model: 'users',
          },
        })
        .populate({
          path: 'names',
          populate: {
            path: 'srLeader',
            model: 'users',
          },
        })
        .populate({
          path: 'division',
          populate: [
            {path: 'details.coordinator.sign', model: 'files'},
            {path: 'details.coordinator.name', model: 'users'},
            {path: 'details.additionalJuniorLeader.sign', model: 'files'},
            {path: 'details.additionalSeniorLeader.sign', model: 'files'},
          ],
        })
        .populate({
          path: 'division',
          populate: {
            path: 'details.seniorLeader.sign',
            model: 'files',
          },
        })
        .populate({
          path: 'division',
          populate: {
            path: 'details.seniorLeader.name',
            model: 'users',
          },
        })
        .populate({
          path: 'division',
          populate: {
            path: 'details.juniorLeader.sign',
            model: 'files',
          },
        })
        .populate({
          path: 'division',
          populate: {
            path: 'details.juniorLeader.name',
            model: 'users',
          },
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
        .populate({
          path: 'division',
          populate: {
            path: 'details.officeManager.sign',
            model: 'files',
          },
        })
        .populate({
          path: 'division',
          populate: {
            path: 'details.officeManager.name',
            model: 'users',
          },
        }),
      message: 'Successfully fetched FR',
    });
  } catch (error) {
    next(error);
  }
});
FRRouter.get('/optimized/:FRId', authCheck(['READ_FR']), async (req, res, next) => {
  try {
    const frData = await FR.findById(req.params.FRId)
      .populate('particulars')
      .populate('purposeSubdivision')
      .populate('additionalSignature')
      .populate('purposeCoordinator')
      .populate('purposeWorker')
      .populate('revertedBy')
      .populate({
        path: 'particulars',
        populate: {path: 'attachment', model: 'files'},
      })
      .populate({
        path: 'division',
        populate: {
          path: 'details',
          populate: [
            {path: 'prevCoordinator.sign', model: 'files'},
            {path: 'prevJuniorLeader1.sign', model: 'files'},
            {path: 'prevJuniorLeader2.sign', model: 'files'},
            // coordinator.name and coordinator.sign
            {path: 'coordinator.name', model: 'users'},
            {path: 'coordinator.sign', model: 'files'}, // ✅ ADDED
            {path: 'additionalJuniorLeader.sign', model: 'files'},
            {path: 'additionalSeniorLeader.sign', model: 'files'},

            // Senior leader
            {path: 'seniorLeader.sign', model: 'files'},
            {path: 'seniorLeader.name', model: 'users'},

            // Junior leader
            {path: 'juniorLeader.sign', model: 'files'},
            {path: 'juniorLeader.name', model: 'users'},

            // President
            {path: 'president.sign', model: 'files'},
            {path: 'president.name', model: 'users'},

            // Office Manager
            {path: 'officeManager.sign', model: 'files'},
            {path: 'officeManager.name', model: 'users'},
          ],
        },
      })
      .populate({
        path: 'names',
        populate: [
          {
            path: 'jrLeader',
            model: 'users',
            populate: {path: 'officialDetails.eSign', model: 'files'},
          },
          {
            path: 'srLeader',
            model: 'users',
            populate: {path: 'officialDetails.eSign', model: 'files'},
          },
          {
            path: 'coordinator',
            model: 'users',
            populate: {path: 'officialDetails.eSign', model: 'files'},
          },
        ],
      })
      .populate({
        path: 'signatureDelhiDiv',
        populate: [
          {
            path: 'jrLeader',
            model: 'users',
            populate: {path: 'officialDetails.eSign', model: 'files'},
          },
          {
            path: 'srLeader',
            model: 'users',
            populate: {path: 'officialDetails.eSign', model: 'files'},
          },
        ],
      })
      .populate({
        path: 'signatureCustom',
        populate: [
          {path: 'jrLeaderCustom', model: 'customUsers', populate: {path: 'eSign', model: 'files'}},
          {path: 'srLeaderCustom', model: 'customUsers', populate: {path: 'eSign', model: 'files'}},
        ],
      })
      .populate({
        path: 'signature',
        populate: [
          {path: 'president', model: 'files'},
          {path: 'officeMgr', model: 'files'},
        ],
      });

    sendStandardResponse<any>(res, 'OK', {
      data: frData,
      message: 'Successfully fetched FR',
    });
  } catch (error) {
    next(error);
  }
});

FRRouter.get('/:FRId/custom', authCheck(['READ_FR']), async (req, res, next) => {
  try {
    sendStandardResponse<any | null>(res, 'OK', {
      data: await CustomFR.findById(req.params.FRId)
        .populate('purposeSubdivision')
        .populate('division')
        .populate('additionalSignature')
        .populate('purposeCoordinator')
        .populate('purposeWorker')
        .populate('particulars')
        .populate('CoordinatorSign')
        .populate('jrLeaderSign')
        .populate('presidentSign')
        .populate('srLeaderSign')
        .populate({
          path: 'particulars',
          populate: {
            path: 'attachment',
            model: 'files',
          },
        })
        .populate({
          path: 'division',
          populate: [
            {path: 'details.coordinator.sign', model: 'files'},
            {path: 'details.additionalJuniorLeader.sign', model: 'files'},
            {path: 'details.additionalSeniorLeader.sign', model: 'files'},
          ],
        })
        .populate({
          path: 'division',
          populate: {
            path: 'details.seniorLeader.sign',
            model: 'files',
          },
        })
        .populate({
          path: 'division',
          populate: {
            path: 'details.seniorLeader.name',
            model: 'users',
          },
        })
        .populate({
          path: 'division',
          populate: {
            path: 'details.juniorLeader.sign',
            model: 'files',
          },
        })
        .populate({
          path: 'division',
          populate: {
            path: 'details.juniorLeader.name',
            model: 'users',
          },
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
        .populate({
          path: 'division',
          populate: {
            path: 'details.officeManager.sign',
            model: 'files',
          },
        })
        .populate({
          path: 'division',
          populate: {
            path: 'details.officeManager.name',
            model: 'users',
          },
        }),
      message: 'Successfully fetched FR',
    });
  } catch (error) {
    next(error);
  }
});
/**
 * For Get  a FR log by Id
 * [GET] /fr/{FR id}/log
 *
 * ✍🏻
 */
FRRouter.get('/:FRId/log', authCheck(['READ_FR']), async (req, res, next) => {
  try {
    console.log(req.params, 'req.params');

    sendStandardResponse<ITransactionLog[] | null>(res, 'OK', {
      data: await TransactionLog.find({TRId: req.params.FRId}).populate('doneBy').sort({createdAt: 1}),
      message: 'Successfully fetched FR Log',
    });
  } catch (error) {
    next(error);
  }
});

FRRouter.patch(
  '/customEdit/:FRId',
  authCheck(['WRITE_FR']),
  async (req, res, next) => {
    console.log(req.body, '8989');

    // const {FRRequest} = req.body;
    // const {FRno, _id} = FRRequest; // Extra
    const FRno= req.body.FRno;
    // Find another document with the same IROno but a different _id
    const existingIRO = await CustomFR.findOne({FRno, _id: {$ne: req.body._id}});
    const CusFR= await FR.findOne({FRno: FRno});

    console.log(existingIRO?.FRno, 'existingIRO?.IROno');
    console.log(req.body.FRno, 'req.body.IRORequest.IROno');

    if (existingIRO) {
      return sendStandardResponse(res, 'BAD REQUEST', {
        data: 'Custom FRNo already exists',
        message: 'FRNo already exists',
      });
    }
    if (CusFR) {
      return sendStandardResponse(res, 'BAD REQUEST', {
        data: 'FRNo already exists',
        message: 'FRNo already exists',
      });
    }
    try {
      const getData=((previousFR:any, newFR:any)=>{
        const changedFields: { field: string; oldValue: any; newValue: any; }[] = [];
        const schemaPaths = Object.keys(previousFR.toObject()); // Get all schema field names

        schemaPaths.forEach((field) => {
          const previousValue = previousFR[field];
          const newValue = newFR[field];

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
      // console.log(req.body, 'dsd');

      const previousFR = await CustomFR.findById(req.params.FRId);
      const newFR = await CustomFR.findByIdAndUpdate(
        req.params.FRId, // Filter: Find by ID
        {
          $set: {
            ...req.body, // Spread the rest of the request body safely
            isPresident: req.body.isPresident,
            PresidentApprovedDate: req.body.presidentSanctionDate,
            createdBy: res.locals.authUser._id,
            division: req.body.division ?? res.locals.authUser.division,
            specialsanction: req.body.isPresident ? 'Yes' : 'No',
            purposeWorker: req.body.purposeWorker?._id,
            FRno: req.body.FRno,
            kind: req.body.kind,
            // signature: {
            CoordinatorSign: req.body.CoordinatorSign?.[0]?._id,
            jrLeaderSign: req.body.jrLeaderSign?.[0]?._id,
            srLeaderSign: req.body.srLeaderSign?.[0]?._id,
            presidentSign: req.body.presidentSign?.[0]?._id,
            // },
            // names: {
            coordinatorName: req.body.coordinatorName,
            jrLeaderName: req.body.jrLeaderName,
            srLeaderName: req.body.srLeaderName,
            presidentName: req.body.presidentName,
            // },
          },
        },
        {new: true}, // Options: Return updated document
      )
        .populate('division')
        .populate('createdBy');

      if (!previousFR || !newFR) {
        return next(new Error('FR ID Not found'));
      }

      const changedFields = getData(previousFR, newFR);
      console.log(changedFields, 'changedFields');

      // If changes are detected, log them
      if (changedFields.length > 0) {
        // Loop through each changed field and create a separate log
        for (const change of changedFields) {
          const logMessage = `${change.field}: ${change.oldValue} -> ${change.newValue}`;
          console.log(logMessage, 'logMessage');

          // Save a new transaction log for each change
          const logs= await new TransactionLog({
            TRNo: newFR.FRno,
            TRId: new mongoose.Types.ObjectId(req.params.FRId),
            action: logMessage, // Or 'Modified' depending on your use case
            type: 'FR',
            doneBy: res.locals.authUser._id,
            // message: logMessage.toString(),
          }).save();
          console.log(logs, 'logs88');
        }
      }

      sendStandardResponse(res, 'OK', {
        data: newFR,
        message: 'Successfully updated FR',
      });
      // if (previousFR.status !== newFR.status) {
      //   if (newFR.status == FRLifeCycleStates.WAITING_FOR_ACCOUNTS) {
      //     FREvents.emit('Approve', {data: {updatedFR: newFR, status: 'sendToAccounts'}, initiator: res.locals.authUser});
      //   } else if (newFR.status == FRLifeCycleStates.WAITING_FOR_PRESIDENT) {
      //     FREvents.emit('Approve', {data: {updatedFR: newFR, status: 'sendToPresident'}, initiator: res.locals.authUser});
      //     new TransactionLog({
      //       TRNo: newFR?.FRno,
      //       TRId: new mongoose.Types.ObjectId(req.params.FRId),
      //       action: 'forwarded to President',
      //       type: 'FR',
      //       doneBy: res.locals.authUser._id,
      //     }).save();
      //   }
      // }
      // if (!previousFR.signatureSheet && req.body.signatureSheet) {
      //   FREvents.emit('signatureSheetAdded', {data: newFR});
      // }
      // FREvents.emit('update', {data: {previousFR, newFR}});
    } catch (error) {
      next(error);
    }
  },
);

/**
 * For updating a FR for specific operation
 * [PATCH] /fr/{division id}/{operation}
 *
 * @author <annmariya@computervalley.online>, <@annmariyacomputervalley>
 *
 * ✍🏻
 */
FRRouter.patch(
  '/:FRId/:operation',
  authCheck([]),
  async (req, res, next) => {
    let total = 0;

    const eSign= await esignature.find({});
    console.log(eSign[0].officeManagerName, 'Esign');
    req.body.particulars?.forEach((element: { sanctionedAmount: number; }) => {
      total += element.sanctionedAmount ?? 0;
    });
    console.log(total, 'shibins');

    try {
      console.log(req.params.operation);
      if (
        ![
          'Approve',
          'reject',
          'sendToPresident',
          'sendBack',
          'sendToAccounts',
          'reopened',
          'close',
        ].includes(req.params.operation)
      ) {
        next(
          new Error(
            'Only Approve/reject/sendToPresident/sendToAccounts/sendBack operations are allowed by this API endpoint!',
          ),
        );
      }

      if (req.params.operation === 'Approve') {
        const iroId = new mongoose.Types.ObjectId();
        const fr = await FR.findByIdAndUpdate(
          req.params.FRId,
          {
            IRO: iroId,
            sanctionedAmountTotal: total ?? 0,

            // sanctionedAsPer: req.body.sanctionedAsPer.asPer,
          });

        console.log(fr, 'op');

        await new IRO({
          ...req.body,
          _id: iroId,
          kind: 'IRO',
          FR: req.params.FRId,
          IRODate: moment.utc().startOf('D'),
          createdBy: fr?.createdBy,
          sanctionedAmountTotal: total ?? 0,
          purposeWorker: req.body?.purposeWorker?._id,
          approvedBy: res.locals.authUser._id,
          names: {
            president: eSign[0]?.presidentName,
            officeMgr: eSign[0]?.officeManagerName,
          },
          sign: {
            president: eSign[0].presidentSignature,
            officeMgr: eSign[0].officeManagerSignature,
          },
          // sanctionedAsPer: req.body.sanctionedAsPer.asPer,

          IROno: 'IRO' + fr?.FRno.slice(-7),
          // IROno: 'IRO' + fr?.FRno.slice(-4),
          status: IROLifeCycleStates.WAITING_FOR_OFFICE_MNGR,
        })
          .save()
          .then(() => {
            console.log('IRO saved successfully');
          })
          .catch((err) => {
            console.log(err);
          });
        new TransactionLog({
          TRNo: 'IRO' + fr?.FRno.slice(-4),
          TRId: iroId, action: 'created', type: 'IRO', doneBy: res.locals.authUser._id,
        }).save();
      }
      console.log(req.params.operation, 'req.params.operation');

      const fr = await FR.findByIdAndUpdate(
        req.params.FRId,
        {
          ...req.body,
          // 'particulars.sanctionedAmount' : req.body.particulars.sanctionedAmount,
          status:
            req.params.operation === 'Approve' ?
              FRLifeCycleStates.FR_APPROVED :
              req.params.operation === 'reject' ?
                FRLifeCycleStates.REJECTED :
                req.params.operation === 'sendToPresident' ?
                  FRLifeCycleStates.WAITING_FOR_PRESIDENT :
                  req.params.operation === 'sendToAccounts' ?
                    FRLifeCycleStates.WAITING_FOR_ACCOUNTS :
                    req.params.operation === 'sendBack' ?
                      FRLifeCycleStates.FR_SEND_BACK :
                      req.params.operation === 'reopened' ?
                        FRLifeCycleStates.REOPENED :
                        req.params.operation === 'close' ?
                          FRLifeCycleStates.FR_CLOSED :
                          FRLifeCycleStates.FR_CLOSED,
          ...(req.params.operation === 'sendToAccounts' ? {specialsanction: 'Yes', presidentApproveDate: new Date()} : {}), // Conditionally update specialsanction
          ...(req.params.operation === 'Approve' ? {frVerifiedOn: new Date(), isReverted: false, approvedBy: res.locals.authUser._id} : {}), // Conditionally update specialsanction

          ...(req.params.operation === 'sendBack' ? {reasonForSentBack: req.body?.reasonForSentBack, isReverted: true, revertedBy: res.locals.authUser._id} : {}), // Conditionally update specialsanction
          ...(req.params.operation === 'reject' ? {reasonForReject: req.body?.reasonForReject} : {}), // Conditionally update specialsanction
        },
        {new: true},
      ).populate('division').populate('createdBy');
      console.log(fr, 'shibin');
      new TransactionLog({
        TRNo: fr?.FRno,
        TRId: new mongoose.Types.ObjectId(req.params.FRId),
        action: req.params.operation === 'Approve' ?
          'approved' :
          req.params.operation === 'reject' ?
            'rejected' :
            req.params.operation === 'sendToPresident' ?
              'forwarded to President' :
              req.params.operation === 'sendToAccounts' ?
                'forwarded to Accounts' :
                req.params.operation === 'sendBack' ?
                  'returned' :
                  'closed',
        type: 'FR',
        doneBy: res.locals.authUser._id}).save();


      if (!fr) {
        return next(new Error('FR ID Not found'));
      }
      if (req.params.operation =='reopened') {
        new TransactionLog({
          TRNo: fr?.FRno,
          TRId: new mongoose.Types.ObjectId(req.params.FRId),
          action: 'Reopened',
          type: 'FR',
          doneBy: res.locals.authUser._id,
        }).save();
      }
      sendStandardResponse(res, 'OK', {
        data: fr,
        message: `Successfully ${req.params.operation} FR`,
      });
      FREvents.emit('Approve', {data: {updatedFR: fr, status: req.params.operation}, initiator: res.locals.authUser});
      // }
      // else if (req.params.operation === 'Approve'){
      //   staffEvents.emit('Approve', staff);
      // }else {
      //   staffEvents.emit('deactivate', staff);
      // }
    } catch (error) {
      next(error);
    }
  },
);
FRRouter.post(
  '/:FRId/:reopen',
  authCheck([]),
  async (req, res, next) => {
    try {
      const fr = await FR.findByIdAndUpdate(
        req.params.FRId,
        {
          status: FRLifeCycleStates.REOPENED,
          reasonForReopen: req.body?.reasonForReopen,
        },
        {new: true},
      ).populate('division').populate('createdBy');
      if (!fr) {
        return next(new Error('FR ID Not found'));
      }
      sendStandardResponse(res, 'OK', {
        data: fr,
        message: 'Successfully reopened FR',
      });
    } catch (error) {
      next(error);
    }
  },
);
/**
 * For updating  FR
 * [PATCH] /fr/{division id}
 *
 * @author <annmariya@computervalley.online>, <@annmariyacomputervalley>
 *
 * ✍🏻
 */
FRRouter.patch(
  '/:FRId',
  authCheck(['WRITE_FR']),
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
      console.log(req.body, 'dsd');
      console.log(req.body.sourceOfAccount, 'dsd');

      const previousFR = await FR.findById(req.params.FRId);
      console.log(previousFR, 'previousFR');
      const statuss= req.body.status == FRLifeCycleStates.WAITING_FOR_PRESIDENT? FRLifeCycleStates.WAITING_FOR_PRESIDENT: previousFR?.status;
      const newFR = await FR.findByIdAndUpdate(
        req.params.FRId,
        {
          ...req.body, // Spread request body to include all updates
          status: statuss, // Ensure `status` is updated properly
        },
        {
          new: true, // Return the updated document
        },
      )
        .populate('division')
        .populate('createdBy');
      const newIRO = await IRO.findByIdAndUpdate(
        req.body.IRO,
        {
          sourceOfAccount: req.body.sourceOfAccount,
          sanctionedBank: req.body.sanctionedBank,
        },
        {
          new: true, // Return the updated document
        },
      );
      if (previousFR?.status== FRLifeCycleStates.FR_SEND_BACK && req.body.status !== FRLifeCycleStates.WAITING_FOR_PRESIDENT) {
        await FR.findByIdAndUpdate(
          req.params.FRId,
          {
            status: FRLifeCycleStates.WAITING_FOR_ACCOUNTS, // Ensure `status` is updated properly
          },
          {
            new: true, // Return the updated document
          },
        )
          .populate('division')
          .populate('createdBy');
      }
      if (!previousFR || !newFR) {
        return next(new Error('FR ID Not found'));
      }
      sendStandardResponse(res, 'OK', {
        data: newFR,
        message: 'Successfully updated FR',
      });
      if (previousFR.status !== newFR.status) {
        if (newFR.status == FRLifeCycleStates.WAITING_FOR_ACCOUNTS) {
          FREvents.emit('Approve', {data: {updatedFR: newFR, status: 'sendToAccounts'}, initiator: res.locals.authUser});
          new TransactionLog({
            TRNo: newFR?.FRno,
            TRId: new mongoose.Types.ObjectId(req.params.FRId),
            action: 'forwarded to Accounts',
            type: 'FR',
            doneBy: res.locals.authUser._id,
          }).save();
        } else if (newFR.status == FRLifeCycleStates.WAITING_FOR_PRESIDENT) {
          FREvents.emit('Approve', {data: {updatedFR: newFR, status: 'sendToPresident'}, initiator: res.locals.authUser});
          new TransactionLog({
            TRNo: newFR?.FRno,
            TRId: new mongoose.Types.ObjectId(req.params.FRId),
            action: 'forwarded to President',
            type: 'FR',
            doneBy: res.locals.authUser._id,
          }).save();
        }
      }
      if (previousFR.status ==FRLifeCycleStates.REOPENED) {
        new TransactionLog({
          TRNo: newFR?.FRno,
          TRId: new mongoose.Types.ObjectId(req.params.FRId),
          action: 'Reopened IRO edited',
          type: 'FR',
          doneBy: res.locals.authUser._id,
        }).save();
      }
      if (!req.body.isSupport) {
        new TransactionLog({
          TRNo: newFR?.FRno,
          TRId: new mongoose.Types.ObjectId(req.params.FRId),
          action: 'Edited',
          type: 'FR',
          doneBy: res.locals.authUser._id}).save();
      }
      if (!previousFR.signatureSheet && req.body.signatureSheet) {
        FREvents.emit('signatureSheetAdded', {data: newFR});
      }
      FREvents.emit('update', {data: {previousFR, newFR}});
    } catch (error) {
      next(error);
    }
  },
);


FRRouter.delete('/:FrId/force', authCheck(['ADMIN_ACCESS']), async (req, res, next) => {
  try {
    let fr = await CustomFR.findByIdAndDelete(req.params.FrId);
    if (!fr) {
      fr = await FR.findByIdAndDelete(req.params.FrId);
      if (!fr) {
        return next(new Error('FR ID Not found'));
      }
    }
    new TransactionLog({
      TRNo: fr?.FRno,
      TRId: new mongoose.Types.ObjectId(req.params.FRId),
      action: 'Deleted',
      type: 'FR',
      doneBy: res.locals.authUser._id,
    }).save();
    sendStandardResponse(res, 'OK', {
      data: fr,
      message: 'Successfully force deleted FR',
    });
  } catch (error) {
    next(error);
  }
});


// FRRouter.post('/addcategory', async (req, res, next) => {
//   try {
//     console.log(req.body);
//     const category=new Category({
//       ...req.body,
//     });
//     sendStandardResponse(res, 'OK', {
//       data: await category.save(),
//       message: 'Successfully added new categpry',
//     });
//   } catch (error) {
//     next(error);
//   }
// });


export default FRRouter;
