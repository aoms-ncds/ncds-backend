import mongoose, {Schema} from 'mongoose';
import {ITransactions} from '../extras/transaction_types';

const TransactionSchema = new mongoose.Schema<ITransactions>({
  purposeWorker: {type: Schema.Types.ObjectId, ref: 'users', required: false},
  purposeSubdivision: {type: Schema.Types.ObjectId, required: false, ref: 'sub_divisions'},
  division: {type: Schema.Types.ObjectId, required: true, ref: 'divisions'},
  purposeCoordinator: {type: Schema.Types.ObjectId, ref: 'users', required: false},
  designationParticular: {type: Schema.Types.ObjectId, ref: 'designation_particulars', required: false},
  purpose: {type: String, required: true},
  purposeOthers: {type: String, required: false},
  sanctionedAmount: {type: Number, required: false},
  sanctionedAmountTotal: {type: Number, required: false},
  status: {type: Number, required: false},
  sanctionedAsPer: {type: String, required: false},
  specialsanction: {type: String, required: false},
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
  raisedBy: {type: String, required: false},

  frVerifiedOn: {type: Date, required: false},
  iroVerifiedOn: {type: Date, required: false},
  reconciliationOn: {type: Date, required: false},
  iroClosedOn: {type: Date, required: false},
  approvedBy: {type: Schema.Types.ObjectId, ref: 'users', required: false},

}, {
  timestamps: true,
  discriminatorKey: 'kind',
});

const Transactions = mongoose.model<ITransactions>('transaction', TransactionSchema);

export default Transactions;
