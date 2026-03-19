import {Document, Schema, Types, model} from 'mongoose';
import {EmailRegex} from '../../../extras/RegEx';
import {ILanguage} from '../../settings/models/language';
import UserLifeCycleStates from '../../users/extras/UserLifeCycleStates';
import {IDeactivationReason} from '../../users/extras/user_types';

export interface ISpouse extends Document {
  spouseCode: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  dateOfBirth?: Date;
  ProfileAddedOn?: Date;
  spouseOf: Types.ObjectId;
  working?: boolean;
  widowCare?: boolean;
  occupation?: string;
  aadharNo?: string;
  qualification?: string;
  knownLanguages: ILanguage[];
  status?: UserLifeCycleStates;
  division: Types.ObjectId;
  insurance: {
    impactNo: { type: string, required: false },
    dojInsurance: { type: Date, required: false },
    nominee: { type: string, required: false },
    relation: { type: string, required: false },
  },
  reasonForDeactivation?: IDeactivationReason;
  deactivationDate:Date


}

const SpouseSchema = new Schema<ISpouse>({
  spouseCode: {type: String, required: true},
  firstName: {type: String},
  lastName: {type: String},
  email: {
    type: String,
    required: false,
    trim: true,
    lowercase: true,
    sparse: true,
    unique: false,
    validate: [
      (email: string) => EmailRegex.test(email),
      'Please fill a valid email address',
    ],
    match: [EmailRegex, 'Please fill a valid email address'],
  },
  phone: {type: String, required: false},
  dateOfBirth: {type: Date, required: false},
  ProfileAddedOn: {type: Date, required: false},
  spouseOf: {type: Schema.Types.ObjectId, required: true, ref: 'users'},
  working: {type: Boolean, required: false},
  widowCare: {type: Boolean, required: false},
  aadharNo: {type: Number, required: false},
  qualification: {type: String, required: false},
  knownLanguages: [{type: Schema.Types.ObjectId, required: false, ref: 'languages'}],
  status: {type: Number, required: false},
  division: {type: Schema.Types.ObjectId, required: true, ref: 'divisions'},
  insurance: {
    impactNo: {type: String, required: false},
    dojInsurance: {type: Date, required: false},
    nominee: {type: String, required: false},
    relation: {type: String, required: false},
  },
  reasonForDeactivation: {
    type: String,
    enum: ['Voluntarily Left', 'Retired', 'Dismissed', 'Death', 'Other'],
    required: false,
  },
  deactivationDate: {type: Date, required: false},

});

const Spouse = model<ISpouse>('spouses', SpouseSchema);
export default Spouse;
