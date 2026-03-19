
import {Schema, model} from 'mongoose';

export interface IChildSupportAge {
  age: number;
}
const ChildSupportAgeSchema = new Schema<IChildSupportAge>(
  {
    age: {type: Number, required: false},
  },
  {timestamps: true},
);

const ChildSupportAge = model<IChildSupportAge>('child_supports_Age', ChildSupportAgeSchema);
export default ChildSupportAge;

