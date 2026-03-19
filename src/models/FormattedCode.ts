import {Schema, Types, model} from 'mongoose';

export interface IFormattedCode{
    _id: Types.ObjectId;
    workerCode: number; // WK00001
    staffCode: number; // IETWK00001
    childCode: number; // MC00001
    spouseCode: number; // WKS00001
    divCode: number; // DIV00001
    FRCode: number;
    IROCode: number;
    applicationCode:number;
    year: number; // Stores the year for resetting in April

}

const FormattedCodeSchema = new Schema<IFormattedCode>({
  _id: Schema.Types.ObjectId,
  year: {type: Number, required: true}, // Store the year for reset tracking
  workerCode: {type: Number, required: true},
  staffCode: {type: Number, required: true},
  childCode: {type: Number, required: true},
  spouseCode: {type: Number, required: true},
  divCode: {type: Number, required: true},
  FRCode: {type: Number, required: true},
  IROCode: {type: Number, required: true},
  applicationCode: {type: Number, required: true},
});

export const FormattedCode = model<IFormattedCode>('formatted_codes', FormattedCodeSchema);
