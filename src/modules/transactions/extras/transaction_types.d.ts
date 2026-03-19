
import {IWorker} from '../../workers/models/Worker';
import {ISubDivision} from '../../divisions/models/SubDivision';
import {IDivision} from '../../divisions/models/Division';
import {Types} from 'mongoose';

export interface ITransactions extends Document {
  kind: 'FRs' | 'IRO';
  purposeWorker: IWorker;
  purposeSubdivision: ISubDivision;
  division: IDivision;
  purposeCoordinator: IWorker;
  purposeOthers: string;
  sanctionedAmount: number;
  specialsanction: string;
  presidentApproveDate?: Date;
  status: number;
  raisedBy: string;
  sanctionedAsPer: string;
  sanctionedBank: string;
  mainCategory: string;
  createdBy: IWorker;
  particulars?: Types.ObjectId[];
  reasonForSentBack: string;
  reasonForReject: string;
  workerSupport?: boolean;
  childSupport?: boolean;
  purpose: string;
  designationParticular?: string;
  sourceOfAccount?: string;
  additionalSignature?: Types.ObjectId,
  additionalDesignation?: string,
  additionalName?: string,
  sanctionedAmountTotal?: number
  signatureSheet?:string;
  // Print date felids
  frVerifiedOn?:Date,
  iroVerifiedOn?:Date,
  reconciliationOn?:Date,
  iroClosedOn?:Date,
  approvedBy?: Types.ObjectId
  groupIros?: string[];

}
