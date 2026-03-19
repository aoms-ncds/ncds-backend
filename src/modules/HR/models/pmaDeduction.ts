import {Schema, model} from 'mongoose';

export interface IDeduction {
    option: string;
    amount: number;
    deductions:[{
      deductionAmount: number;
      monthFrom:number;
      monthTo:number;
    }]
}

export const PmaDeductionSchema = new Schema<IDeduction>(
  {
    option: {type: String, required: false},
    amount: {type: Number, required: false},
    deductions: [{
      deductionAmount: {type: Number, required: false},
      monthFrom: {type: Number, required: false},
      monthTo: {type: Number, required: false},
    }],
  },
  {timestamps: true},
);

const PmaDeduction = model<IDeduction>('pmadeductions', PmaDeductionSchema);
export default PmaDeduction;
