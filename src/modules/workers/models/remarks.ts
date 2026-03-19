import {Schema, Types, model} from 'mongoose';
export interface IRemark{
    _id: Types.ObjectId;
    remark: string;
    user: Types.ObjectId;
    createdBy: Types.ObjectId;
}


const remarksSchema = new Schema<IRemark>({
  remark: {type: String, required: true},
  user: {type: Schema.Types.ObjectId, ref: 'transaction', required: false},
  createdBy: {type: Schema.Types.ObjectId, ref: 'users', required: false},
}, {timestamps: true});

const workerRemarks = model<IRemark>('worker_remarks', remarksSchema);
export default workerRemarks;

