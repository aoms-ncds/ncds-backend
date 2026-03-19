import {Schema, model} from 'mongoose';

export interface IDepartment{
    name: string;
    status: number;
}
const DepartmentSchema = new Schema<IDepartment>({
  name: {type: String, required: true},
  status: {
    type: Number,
    required: true,
  },
}, {timestamps: true});

const Department = model<IDepartment>('department', DepartmentSchema);
export default Department;
