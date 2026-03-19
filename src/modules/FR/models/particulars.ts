import {Schema, model, Document, Types} from 'mongoose';
import {IFR} from './FR';


export interface IParticulars extends Document{
  mainCategory: string;
  subCategory1: string;
  subCategory2: string;
  subCategory3: string;
  quantity: number;
  month: string;
  isUpcomingYear?:boolean;
  requestedAmount: number;
  narration: string;
  attachment:Types.ObjectId[];
  applicationAttachment:Types.ObjectId[];
  unitPrice:number;
  FR?:IFR;
  sanctionedAsPer?: string;
  sanctionedAmount?: number;
  year?: number;
  applicationReferenceNo?: string;
  presidentSanctionAmt?: number;

}

const ParticularsSchema = new Schema<IParticulars>({
  mainCategory: {type: String, required: true},
  subCategory1: {type: String, required: true},
  subCategory2: {type: String, required: true},
  subCategory3: {type: String, required: false},
  quantity: {type: Number, required: false, default: 0},
  month: {type: String, required: true},
  isUpcomingYear: {type: Boolean, required: false},
  requestedAmount: {type: Number, required: true},
  unitPrice: {type: Number, required: true},
  narration: {type: String, required: true},
  FR: {type: Schema.Types.ObjectId, ref: 'FRs'},
  attachment: [{type: Schema.Types.ObjectId, required: false, ref: 'files'}],
  applicationAttachment: [{type: Schema.Types.ObjectId, required: false, ref: 'files'}],
  sanctionedAsPer: {type: String, required: false},
  sanctionedAmount: {type: Number, required: false},
  year: {type: Number, required: false},
  applicationReferenceNo: {type: String, required: false},
  presidentSanctionAmt: {type: Number, required: false},


}, {timestamps: true});

const Particulars = model<IParticulars>('particulars', ParticularsSchema);
export default Particulars;


