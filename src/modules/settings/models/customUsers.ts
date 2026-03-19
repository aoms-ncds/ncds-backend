import {Schema, Types, model} from 'mongoose';


export interface ICustomUser {
  name: string;
  division?: Types.ObjectId;
  eSign?: Types.ObjectId;
}

export const CustomUserSchema = new Schema<ICustomUser>(
  {
    name: {type: String, required: true},
    division: {type: Schema.Types.ObjectId, required: false, ref: 'divisions'},
    eSign: {type: Schema.Types.ObjectId, required: false, ref: 'files'},
  },
  {timestamps: true},
);
export const CustomUser = model<ICustomUser>('customUsers', CustomUserSchema);
export default CustomUser;
