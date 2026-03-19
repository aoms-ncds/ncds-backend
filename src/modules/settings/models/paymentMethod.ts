import {Schema, model} from 'mongoose';

export interface IPaymentMethod {
    paymentMethod: string;
}

export const PaymentSchema = new Schema<IPaymentMethod>(
  {
    paymentMethod: {type: String, required: false, unique: true},
  },
  {timestamps: true},
);

const PaymentMethod = model<IPaymentMethod>('paymentMethods', PaymentSchema);
export default PaymentMethod;
