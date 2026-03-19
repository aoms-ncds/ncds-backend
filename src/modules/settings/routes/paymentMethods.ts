import {Router} from 'express';
import {MongoError} from 'mongodb';
import authCheck from '../../../extras/auth_check';
import {sendStandardResponse} from '../../../extras/helpers';
import CommonLifeCycleStates from '../../../extras/CommonLifeCycleStates';
import PaymentMethod, { IPaymentMethod } from '../models/paymentMethod';

const paymentMethod = Router();

paymentMethod.get('/', authCheck(['READ_ACCESS']), async (req, res, next) => {
  try {
    sendStandardResponse<IPaymentMethod[]>(res, 'OK', {
      data: await PaymentMethod.find(),
      message: 'Successfully fetched list of PaymentMethod',
    });
  } catch (error) {
    next(error);
  }
});
paymentMethod.get('/count', authCheck(['READ_ACCESS']), async (req, res, next) => {
  try {
    sendStandardResponse<number>(res, 'OK', {
      data: await PaymentMethod.countDocuments(),
      message: 'Successfully fetched list of PaymentMethod',
    });
  } catch (error) {
    next(error);
  }
});

paymentMethod.post(
  '/',
  authCheck(['READ_ACCESS']),
  async (req, res, next) => {
    try {
      const payment = new PaymentMethod({...req.body, status: CommonLifeCycleStates.ACTIVE});
      await payment.validate();
      sendStandardResponse(res, 'OK', {
        data: await payment.save(),
        message: 'Successfully added new payment',
      });
    } catch (error) {
      if (error instanceof MongoError && error.code === 11000) {
        // Duplicate entry error
        return sendStandardResponse(res, 'CONFLICT', {
          error: 'Duplicate entry error',
          message: 'Another payment with the same name already exists!',
        });
      }
      next(error);
    }
  },
);

paymentMethod.get(
  '/:paymentId',
  authCheck(['READ_ACCESS']),
  async (req, res, next) => {
    try {
      sendStandardResponse<IPaymentMethod | null>(res, 'OK', {
        data: await PaymentMethod.findById(req.params.paymentId),
        message: 'Successfully fetched payment',
      });
    } catch (error) {
      next(error);
    }
  },
);

paymentMethod.patch(
  '/:paymentId',
  authCheck(['READ_ACCESS']),
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
      const previouspayment = await PaymentMethod.findById(
        req.params.paymentId,
      );
      const newpayment = await PaymentMethod.findByIdAndUpdate(
        req.params.paymentId,
        req.body,
        {new: true},
      );
      if (!previouspayment || !newpayment) {
        return next(new Error('PaymentMethod ID Not found'));
      }

      sendStandardResponse(res, 'OK', {
        data: newpayment,
        message: 'Successfully updated PaymentMethod',
      });
    } catch (error) {
      next(error);
    }
  },
);

paymentMethod.delete(
  '/:paymentId',
  authCheck(['READ_ACCESS']),
  async (req, res, next) => {
    try {
      const payment = await PaymentMethod.findOneAndUpdate(
        {_id: req.params.paymentId},
        {status: CommonLifeCycleStates.DELETED},
        {new: true},
      );
      if (!payment) {
        return next(new Error('payment ID Not found'));
      }
      sendStandardResponse(res, 'OK', {
        data: payment,
        message: 'Successfully deleted payment',
      });
    } catch (error) {
      next(error);
    }
  },
);

paymentMethod.delete(
  '/:paymentId/force',
  authCheck(['READ_ACCESS']),
  async (req, res, next) => {
    try {
      const payment = await PaymentMethod.findOneAndDelete({
        _id: req.params.paymentId,
      });
      if (!payment) {
        return next(new Error('payment ID Not found'));
      }
      sendStandardResponse(res, 'OK', {
        data: payment,
        message: 'Successfully force deleted payment',
      });
    } catch (error) {
      next(error);
    }
  },
);

export default paymentMethod;
