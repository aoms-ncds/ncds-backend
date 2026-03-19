import {Schema, Types} from 'mongoose';
import Transactions from '../../transactions/models/transactions';
import {ITransactions} from '../../transactions/extras/transaction_types';

export interface IROrder extends ITransactions {
  _id: Types.ObjectId;
  IROno: string;
  FR: Types.ObjectId;
  IRODate: Date;
  purpose: string;
  status: number;
  releaseAmount?: Types.ObjectId;
  transferredAmountEach?: number;
  // sanctionedAmount?: number;
  billAttachment: Types.ObjectId[];
  groupIros?: string[];
  signature?: {
    hrSignature?: Types.ObjectId;
    accountManagerSignature?: Types.ObjectId;
    accountantSignature?: Types.ObjectId;
    officeManagerSignature?: Types.ObjectId | string,
  }
  names: {
    president: Types.ObjectId,
    officeMgr: Types.ObjectId,
  },
  sign: {
    president: Types.ObjectId,
    officeMgr: Types.ObjectId,
  },
  reasonForRejectIRO?:string;
  reasonForRevertIRO?:string;
  closedIroPdf?:string;
  reasonForRevertToDivision?:string;

  // signature?: {
  //   hrSignature?: {
  //     sign: Types.ObjectId;
  //   };
  //   accountManagerSignature: {
  //     sign: Types.ObjectId;
  //   };
  //   accountantSignature: {
  //     sign: Types.ObjectId;
  //   };
  // };
  // files:Types.ObjectId[];
}

const IROSchema = new Schema<IROrder>(
  {
    IROno: {type: String, required: true},
    IRODate: {type: Date, required: true},
    purpose: {type: String, required: true},
    specialsanction: {type: String, required: false},
    reasonForRejectIRO: {type: String, required: false},
    reasonForRevertIRO: {type: String, required: false},
    reasonForRevertToDivision: {type: String, required: false},
    status: {type: Number, required: true},
    sanctionedAmountTotal: {type: Number, required: false},
    releaseAmount: {type: Schema.Types.ObjectId, ref: 'release_amount'},
    transferredAmountEach: {type: Number, required: false},
    FR: {type: Schema.Types.ObjectId, required: true, ref: 'FRs'},
    billAttachment: [
      {type: Schema.Types.ObjectId, required: false, ref: 'files'},
    ],
    groupIros: [{type: String, required: false}],
    signature: {
      hrSignature: {type: Schema.Types.ObjectId, ref: 'files'},
      accountManagerSignature: {type: Schema.Types.ObjectId, ref: 'files'},
      accountantSignature: {type: Schema.Types.ObjectId, ref: 'files'},
      officeManagerSignature: {type: Schema.Types.ObjectId, ref: 'files'},
    },
    names: {
      president: {type: String, required: false},
      officeMgr: {type: String, required: false},
    },
    sign: {
      president: {type: Schema.Types.ObjectId, ref: 'files'},
      officeMgr: {type: Schema.Types.ObjectId, ref: 'files'},
    },
    closedIroPdf: {type: Schema.Types.ObjectId, required: false, ref: 'files'},


    // files: [{type: Schema.Types.ObjectId, ref: 'files'}],
    // signature: {
    //   hrSignature: {
    //     sign: {type: Schema.Types.ObjectId, ref: 'files'},
    //   },
    //   accountantSignature: {
    //     sign: {type: Schema.Types.ObjectId, ref: 'files'},
    //   },
    //   accountManagerSignature: {
    //     sign: {type: Schema.Types.ObjectId, ref: 'files'},
    //   },
    // },
  },
  {timestamps: true},
);

// const IRO = model<IROrder>("IRO", IROSchema);
const IRO = Transactions.discriminator<IROrder>('IRO', IROSchema);
export default IRO;
