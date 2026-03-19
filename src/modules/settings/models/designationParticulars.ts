import {Schema, Types, model} from 'mongoose';


export interface IDesignationParticulars{
  title: string;
  mainCategory: Types.ObjectId;
  subCategory1: string;
  subCategory2: string;
  subCategory3: string;
  designations:Types.ObjectId[];
}

const DesignationParticularsSchema = new Schema<IDesignationParticulars>({
  title: {type: String, required: true},
  mainCategory: {type: Schema.Types.ObjectId, required: false, ref: 'main_category'},
  subCategory1: {type: String, required: true},
  subCategory2: {type: String, required: true},
  subCategory3: {type: String, required: true},
  designations: [{type: Schema.Types.ObjectId, required: false, ref: 'designation'}],
}, {timestamps: true});

const DesignationParticulars = model<IDesignationParticulars>('designation_particulars', DesignationParticularsSchema);
export default DesignationParticulars;


