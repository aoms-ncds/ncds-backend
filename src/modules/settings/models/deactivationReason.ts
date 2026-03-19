import {Schema, model} from 'mongoose';

export interface IReason {
    reason: string;
}

export const ReasonSchema = new Schema<IReason>(
  {
    reason: {type: String, required: false, unique: true},
  },
  {timestamps: true},
);

const Reason = model<IReason>('reason', ReasonSchema);
export default Reason;
