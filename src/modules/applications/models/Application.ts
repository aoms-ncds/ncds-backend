import {ObjectId} from 'mongodb';
import mongoose, {Schema, Types, model, Document} from 'mongoose';

export interface IApplication extends Document {
  name: string;
  reason: string;
  status: number;
  presidentSanction: boolean;
  createdBy: Types.ObjectId;
  attachment:Types.ObjectId[];
  division: Types.ObjectId;
  workersName: Types.ObjectId;
  applicationCode:string;
  reasonForDeactivation:string;
  reasonForRevert:string;
  remark:string;
  appliedFor:string;
  applicantName:string;
  requestedAmount:number;
  sanctionedAmount:number;
  approvedDate:Date;
  // For President
  validityDate:string;
  presidentRemark:string;
  coordinatorName:Types.ObjectId;
  presidentName:string;
  presidentSignature: Types.ObjectId;
  letterNumber:string;
  formData?:any;
  welfare?:boolean;
  asset?:boolean;

}

const ApplicationSchema = new Schema<IApplication>(
  {
    applicationCode: {type: String, required: true},
    formData: {type: mongoose.Schema.Types.Mixed, required: false},
    name: {type: String, required: true},
    reason: {type: String, required: false},
    reasonForDeactivation: {type: String, required: false},
    reasonForRevert: {type: String, required: false},
    remark: {type: String, required: false},
    presidentSanction: {type: Boolean, required: false},
    status: {type: Number, required: true},
    createdBy: {type: Schema.Types.ObjectId, required: true, ref: 'users'},
    attachment: [{type: Schema.Types.ObjectId, required: false, ref: 'files'}],
    division: {type: Schema.Types.ObjectId, required: true, ref: 'divisions'},
    workersName: {type: Schema.Types.ObjectId, required: false, ref: 'users'},
    appliedFor: {type: String, required: false},
    applicantName: {type: String, required: false},
    requestedAmount: {type: Number, required: false},
    sanctionedAmount: {type: Number, required: false},
    approvedDate: {type: Date, required: false},

    validityDate: {type: String, required: false},
    presidentRemark: {type: String, required: false},
    coordinatorName: {type: Schema.Types.ObjectId, required: false, ref: 'users'},
    presidentName: {type: String, required: false},
    presidentSignature: {type: Schema.Types.ObjectId, required: false, ref: 'files'},
    letterNumber: {type: String, required: false},
    welfare: {type: Boolean, required: false},
    asset: {type: Boolean, required: false},
  },
  {timestamps: true},
);

const Application = model<IApplication>('applications', ApplicationSchema);
export default Application;

export const applicationStatus = {
  deleted: -1,
  inactive: 0,
  active: 1,
};

export const statusTextToStatusCode = (x: 'deleted' | 'inactive' | 'active') =>
  applicationStatus[x];
