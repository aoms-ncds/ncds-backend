import {Router} from 'express';
import authCheck from '../../../extras/auth_check';
import {sendStandardResponse} from '../../../extras/helpers';
import TransactionLog, {ITransactionLog} from '../../FR/models/transactionLog';
import moment from 'moment';
import transactionLogEvents from '../events/transaction_event';

const transactionLogRouter = Router();

transactionLogRouter.get('/', authCheck(['ADMIN_ACCESS']), async (req, res, next) => {
  try {
    const data=await TransactionLog.find({
      createdAt: {
        $gt: moment.utc(req.query?.startDate as string).startOf('D').toDate(),
        $lt: moment.utc(req.query?.endDate as string).endOf('D').toDate(),
      },
    }).populate('doneBy').sort({createdAt: -1});


    sendStandardResponse<ITransactionLog[]>(res, 'OK', {
      data: data,
      message: 'Successfully fetched Transaction log',
    });
  } catch (error) {
    next(error);
  }
});
transactionLogRouter.delete('/', authCheck(['ADMIN_ACCESS']), async (req, res, next) => {
  try {
    const data=await TransactionLog.find({
      createdAt: {
        $gt: moment.utc(req.query?.startDate as string).startOf('D').toDate(),
        $lt: moment.utc(req.query?.endDate as string).endOf('D').toDate(),
      },
    }).populate('doneBy').sort({createdAt: -1});

    await TransactionLog.deleteMany({
      createdAt: {
        $gt: moment.utc(req.query?.startDate as string).startOf('D').toDate(),
        $lt: moment.utc(req.query?.endDate as string).endOf('D').toDate(),
      },
    }).populate('doneBy').sort({createdAt: -1});


    sendStandardResponse<ITransactionLog[]>(res, 'OK', {
      data: data,
      message: 'Successfully deleted Transaction log',
      success: true,
    });
    // eslint-disable-next-line max-len
    transactionLogEvents.emit('delete', {data: {dateRange: `${moment.utc(req.query?.startDate as string).startOf('D').format('DD/MM/YYYY')} to ${moment.utc(req.query?.endDate as string).startOf('D').format('DD/MM/YYYY')}`}, initiator: res.locals.authUser});
  } catch (error) {
    next(error);
  }
});


export default transactionLogRouter;
