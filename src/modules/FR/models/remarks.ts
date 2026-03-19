import {Schema, Types, model} from 'mongoose';
export interface IRemark{
    _id: Types.ObjectId;
    remark: string;
    FR: Types.ObjectId;
    createdBy: Types.ObjectId;
}


const remarksSchema = new Schema<IRemark>({
  remark: {type: String, required: true},
  FR: {type: Schema.Types.ObjectId, ref: 'transaction', required: false},
  createdBy: {type: Schema.Types.ObjectId, ref: 'users', required: false},
}, {timestamps: true});

const Remarks = model<IRemark>('remarks', remarksSchema);
export default Remarks;

