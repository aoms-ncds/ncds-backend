import mongoose, {Schema, Document, Types} from 'mongoose';
import {AddressSchema, IAddress} from '../../../models/Address';

export interface IDivision extends Document {
  details: DivisionDetails;
  subDivisions: Types.ObjectId[];
  DivisionBankFCRA?: IBankDetails;
  DivisionBankLocal?: IBankDetails;
  BeneficiaryBank1?: IBankDetails;
  BeneficiaryBank2?: IBankDetails;
  BeneficiaryBank3?: IBankDetails;
  BeneficiaryBank4?: IBankDetails;
  BeneficiaryBank5?: IBankDetails;
  BeneficiaryBank6?: IBankDetails;
  BeneficiaryBank7?: IBankDetails;
  BeneficiaryBank8?: IBankDetails;
  BeneficiaryBank9?: IBankDetails;
  BeneficiaryBank10?: IBankDetails;
  BeneficiaryBank11?: IBankDetails;
  BeneficiaryBank12?: IBankDetails;
  BeneficiaryBank13?: IBankDetails;
  BeneficiaryBank14?: IBankDetails;
  BeneficiaryBank15?: IBankDetails;
  BeneficiaryBank16?: IBankDetails;
  BeneficiaryBank17?: IBankDetails;
  BeneficiaryBank18?: IBankDetails;
  BeneficiaryBank19?: IBankDetails;
  BeneficiaryBank20?: IBankDetails;

  FCRABankDetails?: IBankDetails;
  localBankDetails?: IBankDetails;
  otherBankDetails?: IBankDetails;
  otherBankDetails1?: IBankDetails;
  otherBankDetails2?: IBankDetails;
  otherBankDetails3?: IBankDetails;
  otherBankDetails4?: IBankDetails;
  status: number;
}

interface DivisionDetails {
  name: string;
  divisionId: string;
  contactNumber?: string;
  email?: string;
  address: IAddress;
  noOfWorkers?: number;
  noOfSubdivisions?: number;
  noOfChurches?: number;
  isIT?: boolean;
  // coordinator?: Types.ObjectId;
  // seniorLeader?: Types.ObjectId;
  // juniorLeader?: Types.ObjectId;
  // attachment: Types.ObjectId[];
  coordinator?: {
    name?: Types.ObjectId;
    sign?: Types.ObjectId;
  };
  seniorLeader?: {
    name: Types.ObjectId;
    sign?: Types.ObjectId;
  };
  juniorLeader?: {
    name?: Types.ObjectId;
    sign?: Types.ObjectId;
  };
  prevCoordinator?: {
    name?: string;
    sign?: Types.ObjectId;
  };
  prevJuniorLeader1?: {
    name: string;
    sign?: Types.ObjectId;
  };
  prevJuniorLeader2?: {
    name?: string;
    sign?: Types.ObjectId;
  };
  president?: {
    name?: Types.ObjectId;
    sign?: Types.ObjectId;
  };
  officeManager?: {
    name?: Types.ObjectId;
    sign?: Types.ObjectId;
  };
  additionalSeniorLeader: {
    name: {type: Schema.Types.ObjectId, ref: 'users'},
    sign: {type: Schema.Types.ObjectId, ref: 'files'},
  },
  additionalJuniorLeader: {
    name: {type: Schema.Types.ObjectId, ref: 'users'},
    sign: {type: Schema.Types.ObjectId, ref: 'files'},
  },
}

export interface IBankDetails {
  bankName?: string;
  branchName?: string;
  accountNumber?: string;
  IFSCCode?: string;
  beneficiary?: string;
}

export const BankDetailsSchema: Schema<IBankDetails> = new Schema({
  bankName: {type: String},
  branchName: {type: String},
  accountNumber: {type: String},
  IFSCCode: {type: String},
  beneficiary: {type: String},
});

const DivisionDetailsSchema: Schema<DivisionDetails> = new Schema({
  name: {type: String, required: true},
  divisionId: {type: String, required: true},
  isIT: {type: Boolean, required: false},
  contactNumber: {type: String, required: false},
  email: {type: String, required: false},
  address: {type: AddressSchema, required: true},
  noOfWorkers: {type: Number, required: false},
  noOfSubdivisions: {type: Number, required: false},
  noOfChurches: {type: Number, required: false},
  coordinator: {
    name: {type: Schema.Types.ObjectId, ref: 'users'},
    sign: {type: Schema.Types.ObjectId, ref: 'files'},
  },
  seniorLeader: {
    name: {type: Schema.Types.ObjectId, ref: 'users'},
    sign: {type: Schema.Types.ObjectId, ref: 'files'},
  },
  juniorLeader: {
    name: {type: Schema.Types.ObjectId, ref: 'users'},
    sign: {type: Schema.Types.ObjectId, ref: 'files'},
  },
  prevCoordinator: {
    name: {type: String},
    sign: {type: Schema.Types.ObjectId, ref: 'files'},
  },
  prevJuniorLeader1: {
    name: {type: String},
    sign: {type: Schema.Types.ObjectId, ref: 'files'},
  },
  prevJuniorLeader2: {
    name: {type: String},
    sign: {type: Schema.Types.ObjectId, ref: 'files'},
  },
  additionalSeniorLeader: {
    name: {type: Schema.Types.ObjectId, ref: 'customUsers'},
    sign: {type: Schema.Types.ObjectId, ref: 'files'},
  },
  additionalJuniorLeader: {
    name: {type: Schema.Types.ObjectId, ref: 'customUsers'},
    sign: {type: Schema.Types.ObjectId, ref: 'files'},
  },
  president: {
    name: {type: Schema.Types.ObjectId, ref: 'users'},
    sign: {type: Schema.Types.ObjectId, ref: 'files'},
  },
  officeManager: {
    name: {type: Schema.Types.ObjectId, ref: 'users'},
    sign: {type: Schema.Types.ObjectId, ref: 'files'},
  },
});

const DivisionSchema: Schema<IDivision> = new Schema({
  details: {type: DivisionDetailsSchema, required: true},
  subDivisions: [{type: Schema.Types.ObjectId, ref: 'sub_divisions'}],
  DivisionBankFCRA: {type: BankDetailsSchema},
  DivisionBankLocal: {type: BankDetailsSchema},
  BeneficiaryBank1: {type: BankDetailsSchema},
  BeneficiaryBank2: {type: BankDetailsSchema},
  BeneficiaryBank3: {type: BankDetailsSchema},
  BeneficiaryBank4: {type: BankDetailsSchema},
  BeneficiaryBank5: {type: BankDetailsSchema},
  BeneficiaryBank6: {type: BankDetailsSchema},
  BeneficiaryBank7: {type: BankDetailsSchema},
  BeneficiaryBank8: {type: BankDetailsSchema},
  BeneficiaryBank9: {type: BankDetailsSchema},
  BeneficiaryBank10: {type: BankDetailsSchema},
  BeneficiaryBank11: {type: BankDetailsSchema},
  BeneficiaryBank12: {type: BankDetailsSchema},
  BeneficiaryBank13: {type: BankDetailsSchema},
  BeneficiaryBank14: {type: BankDetailsSchema},
  BeneficiaryBank15: {type: BankDetailsSchema},
  BeneficiaryBank16: {type: BankDetailsSchema},
  BeneficiaryBank17: {type: BankDetailsSchema},
  BeneficiaryBank18: {type: BankDetailsSchema},
  BeneficiaryBank19: {type: BankDetailsSchema},
  BeneficiaryBank20: {type: BankDetailsSchema},

  FCRABankDetails: {type: BankDetailsSchema},
  localBankDetails: {type: BankDetailsSchema},
  otherBankDetails: {type: BankDetailsSchema},
  otherBankDetails1: {type: BankDetailsSchema},
  otherBankDetails2: {type: BankDetailsSchema},
  otherBankDetails3: {type: BankDetailsSchema},
  otherBankDetails4: {type: BankDetailsSchema},
  status: {type: Number, required: true},
});

const Division = mongoose.model<IDivision>('divisions', DivisionSchema);

export default Division;
