import {Schema, model} from 'mongoose';

export interface IChildSupport {
  name: string;
  status: number;
  amount: number;
}

const ChildSupportSchema = new Schema<IChildSupport>(
  {
    name: {type: String, required: true, unique: true},
    status: {
      type: Number,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
  },
  {timestamps: true},
);

const ChildSupport = model<IChildSupport>('child_supports', ChildSupportSchema);
export default ChildSupport;

export const ChildSupportStatus = {
  deleted: -1,
  inactive: 0,
  active: 1,
};

export const statusTextToStatusCode = (x: 'deleted' | 'inactive' | 'active') =>
  ChildSupportStatus[x];
