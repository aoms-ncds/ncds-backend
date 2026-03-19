import {Schema, model} from 'mongoose';

export interface ICounts{
    IRAppliedCount?: string;
}

export const Count = new Schema<ICounts>({
  IRAppliedCount: {type: Number, required: false},

});
export const Counts = model<ICounts>('Counts', Count);
