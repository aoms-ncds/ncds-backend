import {Schema, model, Document, Types} from 'mongoose';


export interface IUserUpdateLog extends Document{
userCode:string;
userId:Types.ObjectId;
field:string;
doneBy:Types.ObjectId;
}

const UserUpdateLogSchema = new Schema<IUserUpdateLog>({
  userCode: {type: String, required: true},
  field: {type: String, required: true},
  userId: {type: Schema.Types.ObjectId, required: true, ref: 'users'},
  doneBy: {type: Schema.Types.ObjectId, ref: 'users'},
}, {timestamps: true});

const UserUpdateLog = model<IUserUpdateLog>('user_update_log', UserUpdateLogSchema);
export default UserUpdateLog;


