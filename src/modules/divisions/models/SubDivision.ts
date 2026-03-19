import {Schema, Types, model} from 'mongoose';
import {IDivision} from './Division';

export interface ISubDivision{
  _id: Types.ObjectId;
    name: string;
    status: number;
    isIT?: boolean;
    division:IDivision,
    leader: Types.ObjectId;
}

const SubDivisionSchema = new Schema<ISubDivision>({
  _id: Schema.Types.ObjectId,
  name: {type: String, required: false},
  isIT: {type: Boolean, required: false},
  division: {type: Schema.Types.ObjectId, ref: 'divisions'},
  status: {
    type: Number,
    required: true,
  },

  leader: {type: Schema.Types.ObjectId, ref: 'users', required: false},
}, {timestamps: true});

const SubDivision = model<ISubDivision>('sub_divisions', SubDivisionSchema);
export default SubDivision;
