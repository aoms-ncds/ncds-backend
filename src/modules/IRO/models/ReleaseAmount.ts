import {Schema, Types, model} from 'mongoose';
import {BankDetailsSchema, IBankDetails} from '../../divisions/models/Division';

export interface IReleaseAmount {
  _id: Types.ObjectId;
  modeOfPayment: string;
  otherModeOfPayment?: string;
  releaseAmount: number;
  adjustedIro?: string;
  adjustedAmount?: number;
  closingBalance?: boolean;
  closingBalanceRemark?: string;
  transactionNumber: string;
  transferredAmount: number;
  transferredAmountEach?: Map<string, number>;
  transferredDate: Date;
  transferredBank: IBankDetails;
  IRO?: Types.ObjectId[];
  attachment:Types.ObjectId[];
  division:Types.ObjectId;

}

const releaseAmountSchema=new Schema<IReleaseAmount>({

  modeOfPayment: {type: String, required: true},
  otherModeOfPayment: {type: String, required: false},
  releaseAmount: {type: Number, required: true},
  adjustedAmount: {type: Number, required: false},
  adjustedIro: {type: String, required: false},
  closingBalance: {type: Boolean, required: false},
  closingBalanceRemark: {type: String, required: false},
  transactionNumber: {type: String, required: false},
  transferredAmount: {type: Number, required: true},
  transferredAmountEach: {
    type: Map,
    of: Number,
  }, transferredDate: {type: Date, required: true},
  transferredBank: {type: BankDetailsSchema},
  IRO: [{type: Schema.Types.ObjectId, ref: 'IRO'}],
  attachment: [{type: Schema.Types.ObjectId, required: false, ref: 'files'}],
  division: {type: Schema.Types.ObjectId, required: true, ref: 'divisions'},
}, {timestamps: true});


const ReleaseAmount=model<IReleaseAmount>('release_amount', releaseAmountSchema);
export default ReleaseAmount;
