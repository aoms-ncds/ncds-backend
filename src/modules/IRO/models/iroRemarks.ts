import {Schema, Types, model} from 'mongoose';
export interface IRemark{
    _id: Types.ObjectId;
    remark: string;
    IRO: Types.ObjectId;
    createdBy: Types.ObjectId;
}


const remarksSchema = new Schema<IRemark>({
  remark: {type: String, required: true},
  IRO: {type: Schema.Types.ObjectId, ref: 'transaction', required: false},
  createdBy: {type: Schema.Types.ObjectId, ref: 'users', required: false},
}, {timestamps: true});

const iroRemarks = model<IRemark>('iro_remarks', remarksSchema);
export default iroRemarks;
