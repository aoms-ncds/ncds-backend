import {Schema, model, Document, Types} from 'mongoose';


export interface IDivisionUpdateLog extends Document{
divName:string;
divId:Types.ObjectId;
field:string;
doneBy:Types.ObjectId;
}

const DivisionUpdateLogSchema = new Schema<IDivisionUpdateLog>({
  divName: {type: String, required: true},
  field: {type: String, required: true},
  divId: {type: Schema.Types.ObjectId, required: true, ref: 'divisions'},
  doneBy: {type: Schema.Types.ObjectId, ref: 'users'},
}, {timestamps: true});

const DivisionUpdateLog = model<IDivisionUpdateLog>('division_update_log', DivisionUpdateLogSchema);
export default DivisionUpdateLog;


