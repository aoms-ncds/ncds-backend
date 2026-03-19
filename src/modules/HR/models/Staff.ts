import {Schema, Types} from 'mongoose';
import {IUser} from '../../users/extras/user_types';
import User from '../../users/models/User';

export interface IStaff extends IUser{
  spouseOfAnother?: Types.ObjectId;
  staffCode: string;
}

const StaffSchema = new Schema<IStaff>({
  // Any fields specific to the staff will be added here.
  spouseOfAnother: {type: Schema.Types.ObjectId, required: false, ref: 'users'},
  staffCode: {type: String, required: true},
});

const Staff = User.discriminator<IStaff>('staff', StaffSchema);
export default Staff;
