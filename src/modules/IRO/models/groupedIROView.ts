import {model, Schema, Types} from 'mongoose';
import {ITransactions} from '../../transactions/extras/transaction_types';

export interface IROrder extends ITransactions {
    IRO: Types.ObjectId;

}

const IROGroupSchema = new Schema<IROrder>(
  {
    IRO: [{type: Schema.Types.ObjectId, required: false, ref: 'IRO'}],

  },
  {timestamps: true},
);

// const IRO = model<IROrder>("IRO", IROSchema);
const GroupedIROView = model<IROrder>('GroupedIROView', IROGroupSchema);
export default GroupedIROView;
