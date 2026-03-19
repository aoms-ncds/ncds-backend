import {Schema, model} from 'mongoose';

export interface IDesignation{
    name: string;
    status: number;
}

const DesignationSchema = new Schema<IDesignation>({
  name: {type: String, required: true, unique: true},
  status: {
    type: Number,
    required: true,
  },
}, {timestamps: true});

const Designation = model<IDesignation>('designations', DesignationSchema);
export default Designation;


export const designationStatus = {
  deleted: -1,
  inactive: 0,
  active: 1,
};

export const statusTextToStatusCode = (x: 'deleted'|'inactive'|'active') => designationStatus[x];
