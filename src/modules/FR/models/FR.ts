import {Types, Schema} from 'mongoose';
import {ITransactions} from '../../transactions/extras/transaction_types';
import Transactions from '../../transactions/models/transactions';
export interface IFR extends ITransactions {
  _id: Types.ObjectId;
  FRno: string;
  FRdate: Date;
  IRO: Types.ObjectId;
  revertedBy: Types.ObjectId;
  raisedBy: string;
  isReverted?: boolean;
    // Particulars: Types.ObjectId[];
  signature?: {
    coordinator?: Types.ObjectId;
    jrLeader?: Types.ObjectId;
    srLeader?: Types.ObjectId;
    president?: Types.ObjectId;
  }
  signatureCustom?: {
    jrLeaderCustom?: Types.ObjectId;
    srLeaderCustom?: Types.ObjectId;
  }
  signatureDelhiDiv?: {
    jrLeader?: Types.ObjectId;
    srLeader?: Types.ObjectId;
  }
  names?: {
    coordinator?: Types.ObjectId;
    jrLeader?: Types.ObjectId;
    srLeader?: Types.ObjectId;
    president?: Types.ObjectId;
  }
  presidentRemarks:string;
  Validity:string;
  presidentSanctionedAmount:string;
}
const FRSchema = new Schema<IFR>({
  FRno: {type: String, required: false},
  FRdate: {type: Date, required: true},
  isReverted: {type: Boolean, required: false},
  IRO: {type: Schema.Types.ObjectId, required: false, ref: 'IROs'},
  specialsanction: {type: String, required: false},
  purposeCoordinator: {type: Schema.Types.ObjectId, ref: 'users', required: false},
  revertedBy: {type: Schema.Types.ObjectId, ref: 'users', required: false},
  raisedBy: {type: String, required: false},
  signature: {
    coordinator: {type: Schema.Types.ObjectId, ref: 'users'},
    jrLeader: {type: Schema.Types.ObjectId, ref: 'users'},
    srLeader: {type: Schema.Types.ObjectId, ref: 'users'},
    president: {type: Schema.Types.ObjectId, ref: 'files'},
    officeMgr: {type: Schema.Types.ObjectId, ref: 'files'},
  },
  signatureCustom: {
    jrLeaderCustom: {type: Schema.Types.ObjectId, ref: 'customUsers'},
    srLeaderCustom: {type: Schema.Types.ObjectId, ref: 'customUsers'},
  },
  signatureDelhiDiv: {
    jrLeader: {type: Schema.Types.ObjectId, ref: 'users'},
    srLeader: {type: Schema.Types.ObjectId, ref: 'users'},
  },
  names: {
    coordinator: {type: Schema.Types.ObjectId, ref: 'users', required: false},
    jrLeader: {type: Schema.Types.ObjectId, ref: 'users', required: false},
    srLeader: {type: Schema.Types.ObjectId, ref: 'users', required: false},
    president: {type: String, required: false},
    officeMgr: {type: String, required: false},
  },
  presidentRemarks: {type: String, required: false},
  Validity: {type: String, required: false},
  presidentSanctionedAmount: {type: String, required: false},


  // Particulars: [{type: Schema.Types.ObjectId, ref: 'particulars'}],

}, {timestamps: true});
const FR = Transactions.discriminator<IFR>('FRs', FRSchema);
export default FR;
