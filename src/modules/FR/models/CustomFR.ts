import {Types, Schema, model} from 'mongoose';
import {ITransactions} from '../../transactions/extras/transaction_types';
import Transactions from '../../transactions/models/transactions';
export interface IFR extends ITransactions {
  _id: Types.ObjectId;
  FRno: string;
  FRdate: Date;
  PresidentApprovedDate: Date;
  IRO: Types.ObjectId;
  kind: string;
  raisedBy?: string;
    // Particulars: Types.ObjectId[];
  // signature?: {
    CoordinatorSign?: Types.ObjectId;
    jrLeaderSign?: Types.ObjectId;
    srLeaderSign?: Types.ObjectId;
    presidentSign?: Types.ObjectId;
  // }
  // names?: {
    coordinatorName?: string;
    jrLeaderName?: string;
    srLeaderName?: string;
    presidentName?: string;
    beneficiaryName?: string;
    sanctionedBank?: string;
  // }
  isPresident?: boolean;
  isCustom?: boolean;
}
const CustomFRSchema = new Schema<IFR>({
  FRno: {type: String, required: false},
  kind: {type: String, required: false},
  raisedBy: {type: String, required: false},
  FRdate: {type: Date, required: true},
  beneficiaryName: {type: String, required: false},

  PresidentApprovedDate: {type: Date, required: false},
  isPresident: {type: Boolean, required: false},
  isCustom: {type: Boolean, required: false},
  IRO: {type: Schema.Types.ObjectId, required: false, ref: 'IROs'},
  specialsanction: {type: String, required: false},
  purposeCoordinator: {type: Schema.Types.ObjectId, ref: 'users', required: false},
  // signature: {
  CoordinatorSign: [{type: Schema.Types.ObjectId, ref: 'files'}],
  jrLeaderSign: [{type: Schema.Types.ObjectId, ref: 'files'}],
  srLeaderSign: [{type: Schema.Types.ObjectId, ref: 'files'}],
  presidentSign: [{type: Schema.Types.ObjectId, ref: 'files'}],
  // },
  // names: {
  coordinatorName: {type: String, required: false},
  jrLeaderName: {type: String, required: false},
  srLeaderName: {type: String, required: false},
  presidentName: {type: String, required: false},
  // },
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
  // Particulars: [{type: Schema.Types.ObjectId, ref: 'particulars'}],

}, {timestamps: true});
const CustomFR = model<IFR>('CustomFRs', CustomFRSchema);
export default CustomFR;
