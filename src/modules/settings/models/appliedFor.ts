import {Schema, model} from 'mongoose';

export interface IAppliedFor {
    name: string;
}

export const AppliedFors = new Schema<IAppliedFor>(
  {
    name: {type: String, required: false},
  },
  {timestamps: true},
);

const AppliedFor = model<IAppliedFor>('appliedFor', AppliedFors);
export default AppliedFor;
