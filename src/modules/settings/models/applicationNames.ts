import {Schema, model} from 'mongoose';

export interface IApplicationNames {
    name: string;
}

export const ApplicationName = new Schema<IApplicationNames>(
  {
    name: {type: String, required: false},
  },
  {timestamps: true},
);

const ApplicationNames = model<IApplicationNames>('applicationNames', ApplicationName);
export default ApplicationNames;
