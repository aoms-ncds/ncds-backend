import {Document, Schema, Types, model} from 'mongoose';
import UserLifeCycleStates from '../../users/extras/UserLifeCycleStates';
import {IDeactivationReason, IGender} from '../../users/extras/user_types';

export interface IChild extends Document {
  childCode: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  childOf: Types.ObjectId;
  childSupport: Types.ObjectId;
  studying: boolean;
  classOfStudy: string;
  working: boolean;
  occupation?: string;
  qualification?: string;
  status?: UserLifeCycleStates;
  division: Types.ObjectId;
  gender?: IGender;
  profileAddedOn?: Date,
  adharCardNo?: number,
  phoneNumber?: number,
  emailId?: string
  higherEducation?: boolean,
  ageOverRide?: boolean,
  courseName?: string,
  totalAmountforCourse?: number,
  startingYear?: Date,
  endingYear?: Date
  childProfile?: string;
  prevCeaAmountDate?: Date
  prevCeaAmount?: string;
  reasonForDeactivation?: IDeactivationReason;
  deactivationDate:Date
  studyHelp?:number
  supportEnabled?:boolean
  reason?:string
  remark?:string
  disabledFrom?:Date
  disabledTo?:Date
  lastRenewalDate?:Date
}

const ChildSchema = new Schema<IChild>({
  childCode: {type: String, required: true},
  firstName: {type: String, required: true},
  lastName: {type: String, required: true},
  remark: {type: String, required: false},
  dateOfBirth: {type: Schema.Types.Date, required: false},
  profileAddedOn: {type: Schema.Types.Date, required: false},
  childOf: {type: Schema.Types.ObjectId, ref: 'users'},
  childSupport: {type: Schema.Types.ObjectId, ref: 'child_supports'},
  studying: {type: Boolean, required: false},
  classOfStudy: {type: String, required: false},
  working: {type: Boolean, required: false},
  occupation: {type: String, required: false},
  qualification: {type: String, required: false},
  status: {type: Number, required: false},
  adharCardNo: {type: Number, required: false},
  phoneNumber: {type: Number, required: false},
  emailId: {type: String, required: false},
  higherEducation: {type: Boolean, required: false},
  ageOverRide: {type: Boolean, required: false},
  courseName: {type: String, required: false},
  totalAmountforCourse: {type: Number, required: false},
  startingYear: {type: Schema.Types.Date, required: false},
  lastRenewalDate: {type: Schema.Types.Date, required: false},
  endingYear: {type: Schema.Types.Date, required: false},
  division: {type: Schema.Types.ObjectId, required: false, ref: 'divisions'},
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other'],
    required: false,
  },
  childProfile: {type: String, required: false},
  reasonForDeactivation: {
    type: String,
    enum: ['Voluntarily Left', 'Retired', 'Dismissed', 'Death', 'Other'],
    required: false,
  },
  deactivationDate: {type: Schema.Types.Date, required: false},
  prevCeaAmountDate: {type: Schema.Types.Date, required: false},
  prevCeaAmount: {type: String, required: false},
  studyHelp: {type: Number, required: false},
  supportEnabled: {type: Boolean, required: true, default: true},
  reason: {type: String, required: false},
  disabledFrom: {type: Date, required: false},
  disabledTo: {type: Date, required: false},
});

const Child = model<IChild>('children', ChildSchema);
export default Child;
