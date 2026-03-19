import {Schema, model} from 'mongoose';

export interface IasPer {
    asPer: string;
}

export const SanctionedAsPerSchema = new Schema<IasPer>(
  {
    asPer: {type: String, required: false, unique: true},
  },
  {timestamps: true},
);

const SanctionedAsPer = model<IasPer>('SanctionedAsPer', SanctionedAsPerSchema);
export default SanctionedAsPer;
