import mongoose, {Schema} from 'mongoose';
import {EmailRegex} from '../../../extras/RegEx';
import {AddressSchema} from '../../../models/Address';
import {IBasicDetails, IOfficialDetails, ISupportDetails, ISupportStructure, IUser} from '../extras/user_types';

const BasicDetailsSchema = new Schema<IBasicDetails>({
  firstName: {type: String, required: true},
  title: {type: String, required: false},
  lastName: {type: String, required: true},
  daughterOrganization: {type: String, required: false},
  organization: {type: String, required: false},
  reasonForReject: {type: String, required: false},

  middleName: {type: String, required: false},
  dateOfBirth: {type: Date, required: true},
  gender: {
    type: Schema.Types.ObjectId,
    required: false,
    ref: 'gender',
  },
  field: {
    type: String,
    enum: ['Field', 'Office Staff'],
    required: false,
  },
  martialStatus: {
    type: String,
    enum: ['Married', 'Unmarried'],
    required: false,
  },
  religion: {
    type: Schema.Types.ObjectId,
    required: false,
    ref: 'religion',
  },
  highestQualification: {type: String, required: false},
  motherTongue: {type: Schema.Types.ObjectId, required: false, ref: 'languages'},
  communicationLanguage: {type: Schema.Types.ObjectId, required: false, ref: 'languages'},
  knownLanguages: [{type: Schema.Types.ObjectId, required: false, ref: 'languages'}],

  email: {
    type: String,
    trim: true,
    lowercase: true,
    unique: false,
    required: false,
    validate: [
      (email: string) => {
        if (email == null) {
          return false;
        }
        return EmailRegex.test(email);
      },
      'Please enter a valid email address in the format user@example.com',
    ],
  },
  email2: {
    type: String,
    required: false,
    // trim: true,
    // lowercase: true,
    // sparse: true,
    // unique: false,
    // validate: [
    //   (email:string) => EmailRegex.test(email),
    //   'Please fill a valid email address',
    // ],
    // match: [EmailRegex, 'Please fill a valid email address'],
  },

  phone: {type: String, required: false},
  alternativePhone: {type: String, required: false},
  PANNo: {type: String, required: false},
  aadhaar: {
    aadhaarNo: {type: String, required: false},
    aadhaarFile: {type: String, required: false, ref: 'files'},
  },
  voterId: {
    voterIdNo: {type: String, required: false},
    voterIdFile: {type: String, required: false, ref: 'files'},
  },

  licenseNumber: {type: String, required: false},
  permanentAddress: {type: AddressSchema, required: true, default: {}},
  currentOfficialAddress: {type: AddressSchema, required: true, default: {}},
  residingAddress: {type: AddressSchema, required: true, default: {}},
  spouseOf: {type: Schema.Types.ObjectId, required: false, ref: 'users'},

});
const OfficialDetailsSchema = new Schema<IOfficialDetails>({
  dateOfJoining: {type: Date, required: true},
  dateOfLeaving: {type: Date, required: false},
  eSign: {type: Schema.Types.ObjectId, ref: 'files'},

  reasonForDeactivation: {
    type: String,
    // enum: ['Voluntarily Left', 'Retired', 'Dismissed', 'Death', 'Other'],
    required: false,
  },
  remarks: {type: String, required: false},
  divisionHistory: [{
    division: {type: Schema.Types.ObjectId, required: true, ref: 'divisions'},
    subDivision: {type: Schema.Types.ObjectId, ref: 'sub_divisions'},
    dateOfDivisionJoining: {type: Date, required: true},
    dateOfDivisionLeaving: {type: Date, required: false},
  }],


  status: {
    type: String,
    enum: ['Active', 'Left', 'Education Leave', 'Sabbatical Leave'],
    required: true,
  },
  noOfChurches: {type: Number, required: false},
});
const SupportDetailsSchema = new Schema<ISupportDetails>({
  designation: {type: String, required: false, ref: 'designations'},
  otherDesignation: {type: String, required: false},
  totalNoOfYearsInMinistry: {type: Number, required: false},
  typeOfFamily: {
    type: String,
    // enum: ['Single', 'Family'],
    required: false,
    validate: {
      validator: function(value: string) {
        // All enum values (add all the distinct enum values)
        const PrevdynamicEnumValues = ['Single Missionary', 'Family Missionary', 'Single', 'Family'];
        // scurrent enum values to be used
        const dynamicEnumValues = ['Single', 'Family'];
        // Allow undefined or null values to pass
        if (value == null) return true;
        // Validate against dynamic enum values
        return dynamicEnumValues.includes(value) || PrevdynamicEnumValues.includes(value);
      },
    },
  },
  withChurch: {type: Boolean, required: false},
  churchName: {type: String, required: false},
  department: {type: String, required: false, ref: 'department'},
  percentageofSelfSupport: {type: Number, required: false},
  selfSupport: {type: Boolean, required: false},
  totalAmount: {type: Number, required: false},
  monthlyDeduction: {type: Number, required: false},

});
const SupportStructureSchema = new Schema<ISupportStructure>({
  basic: {type: Number, required: true, default: 0},
  prevBasic: {type: Number, required: true, default: 0},
  basicLastUpdatedAt: {type: Date, required: false},
  HRA: {type: Number, required: true, default: 0},
  prevHRA: {type: Number, required: true, default: 0},
  HRALastUpdatedAt: {type: Date, required: false},
  spouseAllowance: {type: Number, required: true, default: 0},
  prevSpouseAllowance: {type: Number, required: true, default: 0},
  spouseAllowanceLastUpdatedAt: {type: Date, required: false},
  positionalAllowance: {type: Number, required: true, default: 0},
  prevPositionalAllowance: {type: Number, required: true, default: 0},
  positionalAllowanceLastUpdatedAt: {type: Date, required: false},
  specialAllowance: {type: Number, required: true, default: 0},
  prevSpecialAllowance: {type: Number, required: true, default: 0},
  specialAllowanceLastUpdatedAt: {type: Date, required: false},
  impactDeduction: {type: Number, required: true, default: 0},
  prevImpactDeduction: {type: Number, required: true, default: 0},
  impactDeductionLastUpdatedAt: {type: Date, required: false},
  telAllowance: {type: Number, required: true, default: 0},
  prevTelAllowance: {type: Number, required: true, default: 0},
  telAllowanceLastUpdatedAt: {type: Date, required: false},
  PIONMissionaryFund: {type: Number, required: true, default: 0},
  prevPIONMissionaryFund: {type: Number, required: true, default: 0},
  PIONMissionaryFundLastUpdatedAt: {type: Date, required: false},
  MUTDeduction: {type: Number, required: true, default: 0},
  prevMUTDeduction: {type: Number, required: true, default: 0},
  MUTDeductionLastUpdatedAt: {type: Date, required: false},
  supportEnabled: {type: Boolean, required: true, default: true},
  reason: {type: String, required: false},
  disabledFrom: {type: Date, required: false},
  disabledTo: {type: Date, required: false},
  pmaDeduction: {type: Schema.Types.ObjectId, required: false, ref: 'pmadeductions'},
  prevPmaDeduction: {type: Number, required: true, default: 0},
  pmaDeductionLastUpdatedAt: {type: Date, required: false},

});

const UserSchema = new mongoose.Schema<IUser>({
  password: {type: String, required: false},
  tokens: [{type: String, required: false}],
  permissions: {type: Schema.Types.ObjectId, required: false, ref: 'user_permissions'},
  imageURL: {type: String, required: false},
  basicDetails: BasicDetailsSchema,
  officialDetails: OfficialDetailsSchema,
  supportDetails: SupportDetailsSchema,
  supportStructure: SupportStructureSchema,
  status: {type: Number, required: false},
  lastReset: {type: Date, required: false},
  passwordRestCodeCount: {type: Number, required: true, default: 0},
  insurance: {
    impactNo: {type: String, required: false},
    dojInsurance: {type: Date, required: false},
    nominee: {type: String, required: false},
    relation: {type: String, required: false},
  },
  createdBy: {type: Schema.Types.ObjectId, ref: 'users', required: false},
  division: {type: Schema.Types.ObjectId, required: true, ref: 'divisions'},
}, {
  timestamps: true,
  discriminatorKey: 'kind',
});

const User = mongoose.model<IUser>('users', UserSchema);

export default User;
