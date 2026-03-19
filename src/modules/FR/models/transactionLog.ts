import {Schema, model, Document, Types} from 'mongoose';


export interface ITransactionLog extends Document{
TRNo:string;
TRId:Types.ObjectId;
action:string;
doneBy:Types.ObjectId;
type:'FR'|'IRO'|'settings';
}

const TransactionLogSchema = new Schema<ITransactionLog>({
  TRNo: {type: String, required: true},
  action: {type: String, required: true},
  TRId: {type: Schema.Types.ObjectId, required: true, ref: 'transaction'},
  doneBy: {type: Schema.Types.ObjectId, ref: 'users'},
  type: {type: String,
    enum: ['FR', 'IRO', 'Application', 'settings', 'Other']},

}, {timestamps: true});

const TransactionLog = model<ITransactionLog>('transaction_logs', TransactionLogSchema);
export default TransactionLog;


