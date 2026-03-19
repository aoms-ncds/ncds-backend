import {Schema, model} from 'mongoose';

export interface ILanguage {
  name: string;
  status: number;
}

export const LanguageSchema = new Schema<ILanguage>(
  {
    name: {type: String, required: true, unique: true},
    status: {
      type: Number,
      required: true,
    },
  },
  {timestamps: true},
);

const Language = model<ILanguage>('languages', LanguageSchema);
export default Language;

export const LanguageStatus = {
  deleted: -1,
  inactive: 0,
  active: 1,
};

export const statusTextToStatusCode = (x: 'deleted' | 'inactive' | 'active') =>
  LanguageStatus[x];
