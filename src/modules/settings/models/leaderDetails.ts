import {Schema, model} from 'mongoose';

export interface ILeaderDetails {
    name: string;
    order: number; // Add this

}

export const LeaderSchema = new Schema<ILeaderDetails>(
  {
    name: {type: String, required: false},
    order: {type: Number, required: false, default: 0},
  },
  {timestamps: true},
);

const LeaderDetails = model<ILeaderDetails>('leaderDetails', LeaderSchema);
export default LeaderDetails;
