import {Schema, model} from 'mongoose';

export interface IReligion {
    religion: string;
}

export const ReligionSchema = new Schema<IReligion>(
  {
    religion: {type: String, required: false, unique: true},
  },
  {timestamps: true},
);

const Religion = model<IReligion>('religion', ReligionSchema);
export default Religion;
