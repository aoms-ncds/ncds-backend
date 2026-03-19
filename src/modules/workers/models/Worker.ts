import {Schema, Types} from 'mongoose';
import User from '../../users/models/User';
import {IUser} from '../../users/extras/user_types';

export interface IWorker extends IUser{
  workerCode?: string;
  spouse: Types.ObjectId;
  children: Types.ObjectId[];
  reasonForReject?: string
  reasonForDisapprove?: string

}

const WorkerSchema = new Schema<IWorker>({
  // Any fields specific to the worker will be added here.
  workerCode: {type: String, required: true},
  reasonForReject: {type: String, required: false},
  reasonForDisapprove: {type: String, required: false},
  spouse: {type: Schema.Types.ObjectId, required: false, ref: 'spouses'},
  children: [{type: Schema.Types.ObjectId, required: false, ref: 'children'}],
});

const Worker = User.discriminator<IWorker>('worker', WorkerSchema);
export default Worker;
