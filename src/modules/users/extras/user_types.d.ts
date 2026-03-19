import {Document, Types} from 'mongoose';
import {IAddress} from '../../../models/Address';
import UserLifeCycleStates from './UserLifeCycleStates';
import {IUserPermissions} from '../models/UserPermissions';
import {ILanguage} from '../../settings/models/language';
import {IDivision} from '../../divisions/models/Division';
import {ISubDivision} from '../../divisions/models/SubDivision';
import {IDesignation} from '../../HR/models/Designation';
import {IDepartment} from '../../HR/models/Department';

export interface IBasicDetails {
  firstName: string;
  lastName: string;
  title?: string;
    organization?: string
    reasonForReject?: string
  daughterOrganization?:string
  middleName: string;
  dateOfBirth: Date;
  gender?: IGender;
  field?: IWorkerField;
  martialStatus?: IMaritalStatus;
  religion?:IReligion;
  highestQualification?: string;
  motherTongue?: ILanguage;
  communicationLanguage?: ILanguage;
  knownLanguages?: ILanguage[];
  email: string;
  email2?: string;
  phone?: string;
  alternativePhone?: string;
  PANNo?: string;
  aadhaar?: {
    aadhaarNo?: string;
    aadhaarFile?: string;
  };
  voterId?: {
    voterIdNo?: string;
    voterIdFile?: string;
  };

  licenseNumber?: string;
  permanentAddress: IAddress;
  currentOfficialAddress: IAddress;
  residingAddress: IAddress;
  spouseOf?: IUser;
}

export interface IOfficialDetails {
  dateOfJoining?: Date;
  dateOfLeaving?: Date;
  eSign?: Types.ObjectId;
  reasonForDeactivation?: IDeactivationReason;
  remarks?: string;
  divisionHistory:[{

    division: IDivision;
    subDivision: ISubDivision;
    dateOfDivisionJoining?: Date;
    dateOfDivisionLeaving?: Date;
  }]
  selfSupport?: boolean;
  status: IOfficialDetailsStatus;

  noOfChurches?: number;
}

export type IDeactivationReason = 'Voluntarily Left' | 'Retired' | 'Dismissed' | 'Death' | 'Other';
export type IOfficialDetailsStatus = 'Active' | 'Left' | 'Education Leave' | 'Sabbatical Leave';
export type IReligion='Hindu'| 'Muslim'| 'Christian'|'Sikh';
export type ITypeOfFamily='Single '|'Family ';

export interface ISupportDetails {
  designation?: IDesignation;
  totalNoOfYearsInMinistry?: number;
  typeOfFamily?: ITypeOfFamily;
  otherDesignation?: string;
  withChurch?: boolean;
  department?: IDepartment;
  percentageofSelfSupport: number;
  selfSupport:boolean;
  totalAmount:number;
  monthlyDeduction:number;

}

interface ISupportStructure {
  basic?: number;
  prevBasic?: number;
  basicLastUpdatedAt?:Date ;
  HRA?: number;
  prevHRA?: number;
  HRALastUpdatedAt?:Date ;
  spouseAllowance?: number;
  prevSpouseAllowance?: number;
  spouseAllowanceLastUpdatedAt?:Date ;
  positionalAllowance?: number;
  prevPositionalAllowance?: number;
  positionalAllowanceLastUpdatedAt?:Date ;
  specialAllowance?: number;
  prevSpecialAllowance?: number;
  specialAllowanceLastUpdatedAt?:Date ;
  impactDeduction?: number;
  prevImpactDeduction?: number;
  impactDeductionLastUpdatedAt?:Date ;
  telAllowance?: number;
  prevTelAllowance?: number;
  telAllowanceLastUpdatedAt?:Date ;
  PIONMissionaryFund?: number;
  prevPIONMissionaryFund?: number;
  PIONMissionaryFundLastUpdatedAt?:Date ;
  MUTDeduction?: number;
  prevMUTDeduction?: number;
  MUTDeductionLastUpdatedAt?:Date ;
  supportEnabled?:boolean;
  reason?:string;
  disabledFrom?:Date;
  disabledTo?:Date;
  pmaDeduction?:Types.ObjectId;
  prevPmaDeduction?: number;
  pmaDeductionLastUpdatedAt?:Date ;

}


export interface IUser extends Document {
  kind: 'staff'|'worker';
  password?: string;
  permissions?: IUserPermissions;
  imageURL?: string;
  basicDetails: IBasicDetails;
  officialDetails: IOfficialDetails;
  supportDetails: ISupportDetails;
  supportStructure: ISupportStructure;
  status?: UserLifeCycleStates;
  passwordRestCodeCount: number;
  insurance?: {
    impactNo?: string;
    dojInsurance?: Date;
    nominee?: string;
    relation?: string;
        };
  tokens: string[]
  createdBy?:IUser;
  lastReset?:Date;
  division: Types.ObjectId;
}

export interface IAuthProcess {
  phone: string;
  email: string;
  OTP: string;
  status: number;
  createdAt: Date;
  updatedAt: Date;
}

export type IGender = 'Male' | 'Female' | 'Other';
export type IMaritalStatus = 'Married' | 'Unmarried';
export type IWorkerField = 'Field' | 'Office Staff';
