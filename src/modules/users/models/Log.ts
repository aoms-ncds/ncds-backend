import {Schema, Types, model} from 'mongoose';

export interface ILog{
    user: Types.ObjectId;
    // loginAt: Date;
}
const LogSchema = new Schema<ILog>({
  user: {type: Schema.Types.ObjectId, required: false, ref: 'users'},
  // loginAt: {type: Date, required: true},
}, {timestamps: true});

const log = model<ILog>('log', LogSchema);
export default log;
