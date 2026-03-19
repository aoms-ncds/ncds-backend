import {Schema, model} from 'mongoose';

export interface IDesignation {
  name: string;
  status: number;
}

export const DesignationSchema = new Schema<IDesignation>(
  {
    name: {type: String, required: true, unique: true},
    status: {
      type: Number,
      required: true,
    },
  },
  {timestamps: true},
);

const Designation = model<IDesignation>('designation', DesignationSchema);
export default Designation;

export const DesignationStatus = {
  deleted: -1,
  inactive: 0,
  active: 1,
};

export const statusTextToStatusCode = (x: 'deleted' | 'inactive' | 'active') =>
  DesignationStatus[x];
