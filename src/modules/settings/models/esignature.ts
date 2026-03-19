import {Schema, Types, model} from 'mongoose';

export interface ISignature {
  officeManagerSignature?:Types.ObjectId;
  prevOfficeManagerSignature?:Types.ObjectId;
  presidentSignature?:Types.ObjectId;
  officeManagerName?:string
  prevOfficeManagerName?:string
  presidentEmail?:string
  presidentName?:string
  }

const ISignatureSchema = new Schema<ISignature>(
  {
    officeManagerSignature: {type: Schema.Types.ObjectId, required: false, ref: 'files'},
    prevOfficeManagerSignature: {type: Schema.Types.ObjectId, required: false, ref: 'files'},
    presidentSignature: {type: Schema.Types.ObjectId, required: false, ref: 'files'},
    officeManagerName: {type: String, required: false},
    prevOfficeManagerName: {type: String, required: false},
    presidentEmail: {type: String, required: false},
    presidentName: {type: String, required: false},

  },
  {timestamps: true},
);

const esignature = model<ISignature>('esignature', ISignatureSchema);
export default esignature;
