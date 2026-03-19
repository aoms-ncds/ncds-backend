import {Schema} from 'mongoose';

export interface IAddress{
  buildingName?: string;
  street?: string;
  city?: string;
  district?: string;
  state?: string;
  country?: string;
  pincode?: string;
}

export const AddressSchema = new Schema<IAddress>({
  buildingName: {type: String, required: false},
  street: {type: String, required: false},
  city: {type: String, required: false},
  state: {type: String, required: false},
  country: {type: String, required: false},
  pincode: {type: String, required: false},
});
