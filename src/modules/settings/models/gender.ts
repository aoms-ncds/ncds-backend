import {Schema, model} from 'mongoose';

export interface IGender {
    gender: string;
}

export const GenderSchema = new Schema<IGender>(
  {
    gender: {type: String, required: false, unique: true},
  },
  {timestamps: true},
);

const Gender = model<IGender>('gender', GenderSchema);
export default Gender;
