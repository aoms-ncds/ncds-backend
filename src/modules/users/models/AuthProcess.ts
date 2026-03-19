import { Document, Schema, model } from 'mongoose';
import { IAuthProcess } from '../extras/user_types';

export type IAuthProcessDoc = IAuthProcess & Document;

const AuthProcessSchema = new Schema<IAuthProcessDoc>(
  {
    phone: { type: String, required: false, unique: true, sparse: true },
    email: { type: String, required: false, unique: true, sparse: true },
    OTP: { type: String, required: true },
    status: { type: Number, required: true },
  },
  {
    timestamps: true,
    // expireAfterSeconds: 10,
  }
);

AuthProcessSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 5 });

const AuthProcess = model<IAuthProcessDoc>('auth_processes', AuthProcessSchema);
export default AuthProcess;
