import {Types, Schema, model} from 'mongoose';
import {ITransactions} from '../../transactions/extras/transaction_types';
import Transactions from '../../transactions/models/transactions';
export interface IFR extends ITransactions {
  _id: Types.ObjectId;
  IROno: string;
  FRNumber: string;
  IRODate: Date;
  IRO: Types.ObjectId;
  kind: string;
  transactionNumber?: string;
  modeOfPayment?: string;
  transferredDate?: Date;
  releaseAmount?: number;
  officeManagerName?: string;
  officeManagerSign?: Types.ObjectId;
  attachment:Types.ObjectId[];
    // Particulars: Types.ObjectId[];
  signature?: {
    coordinator?: Types.ObjectId;
    jrLeader?: Types.ObjectId;
    srLeader?: Types.ObjectId;
    president?: Types.ObjectId;
  }
  names?: {
    coordinator?: Types.ObjectId;
    jrLeader?: Types.ObjectId;
    srLeader?: Types.ObjectId;
    president?: Types.ObjectId;
  }
  president?: string;
  beneficiaryName?: string;
  presidentSign?: Types.ObjectId;
  specialSanction?: boolean
  isCustom?: boolean
  bankName?: string
  preparedBy?: string
  coordinatorName?: string
  branchName?: string
  ifscCode?: string
  accNumber?: number
  transferredAmount?: number
 adjustedIro?: string;
  adjustedAmount?: number;
  closingBalance?: boolean;
  closingBalanceRemark?: string;
}
const CustomIROSchema = new Schema<IFR>({
  IROno: {type: String, required: false},
  FRNumber: {type: String, required: false},
  kind: {type: String, required: false},
  president: {type: String, required: false},
  coordinatorName: {type: String, required: false},
  bankName: {type: String, required: false},
  preparedBy: {type: String, required: false},
  branchName: {type: String, required: false},
  ifscCode: {type: String, required: false},
  transferredAmount: {type: String, required: false},
  accNumber: {type: Number, required: false},
  beneficiaryName: {type: String, required: false},
  transactionNumber: {type: String, required: false},
  modeOfPayment: {type: String, required: false},
  transferredDate: {type: Date, required: false},
  releaseAmount: {type: Number, required: false},
  officeManagerSign: [{type: Schema.Types.ObjectId, ref: 'files'}],
  officeManagerName: {type: String, required: false},
  attachment: [{type: Schema.Types.ObjectId, required: false, ref: 'files'}],
  IRODate: {type: Date, required: true},
  IRO: {type: Schema.Types.ObjectId, required: false, ref: 'IROs'},
  specialsanction: {type: String, required: false},
  purposeCoordinator: {type: Schema.Types.ObjectId, ref: 'users', required: false},
  signature: {
    coordinator: {type: Schema.Types.ObjectId, ref: 'files'},
    jrLeader: {type: Schema.Types.ObjectId, ref: 'files'},
    srLeader: {type: Schema.Types.ObjectId, ref: 'files'},
    president: {type: Schema.Types.ObjectId, ref: 'files'},
    officeMgr: {type: Schema.Types.ObjectId, ref: 'files'},
  },
  presidentSign: [{type: Schema.Types.ObjectId, ref: 'files'}],

  names: {
    coordinator: {type: Schema.Types.ObjectId, ref: 'users', required: false},
    jrLeader: {type: Schema.Types.ObjectId, ref: 'users', required: false},
    srLeader: {type: Schema.Types.ObjectId, ref: 'users', required: false},
    president: {type: String, required: false},
    officeMgr: {type: String, required: false},
  },
  purposeWorker: {type: Schema.Types.ObjectId, ref: 'users', required: false},
  purposeSubdivision: {type: Schema.Types.ObjectId, required: false, ref: 'sub_divisions'},
  division: {type: Schema.Types.ObjectId, required: true, ref: 'divisions'},
  designationParticular: {type: Schema.Types.ObjectId, ref: 'designation_particulars', required: false},
  purpose: {type: String, required: true},
  purposeOthers: {type: String, required: false},
  sanctionedAmount: {type: Number, required: false},
  sanctionedAmountTotal: {type: Number, required: false},
  status: {type: Number, required: false},
  sanctionedAsPer: {type: String, required: false},
  presidentApproveDate: {type: Date, required: false},
  sanctionedBank: {type: String, required: false},
  mainCategory: {type: String, required: false},
  particulars: [{type: Schema.Types.ObjectId, ref: 'particulars'}],
  createdBy: {type: Schema.Types.ObjectId, ref: 'users', required: false},
  reasonForSentBack: {type: String, required: false},
  workerSupport: {type: Boolean, required: false},
  isCustom: {type: Boolean, required: false, default: true},
  specialSanction: {type: Boolean, required: false},
  childSupport: {type: Boolean, required: false},
  reasonForReject: {type: String, required: false},
  sourceOfAccount: {type: String, required: false},
  additionalName: {type: String, required: false},
  additionalDesignation: {type: String, required: false},
  additionalSignature: {type: Schema.Types.ObjectId, required: false, ref: 'files'},
  signatureSheet: {type: Schema.Types.ObjectId, required: false, ref: 'files'},

  frVerifiedOn: {type: Date, required: false},
  iroVerifiedOn: {type: Date, required: false},
  reconciliationOn: {type: Date, required: false},
  iroClosedOn: {type: Date, required: false},
  approvedBy: {type: Schema.Types.ObjectId, ref: 'users', required: false},
  adjustedAmount: {type: Number, required: false},
  adjustedIro: {type: String, required: false},
  closingBalance: {type: Boolean, required: false},
  closingBalanceRemark: {type: String, required: false},
  // Particulars: [{type: Schema.Types.ObjectId, ref: 'particulars'}],

}, {timestamps: true});
const CustomIRO = model<IFR>('CustomIROs', CustomIROSchema);
export default CustomIRO;
