import {Schema, model} from 'mongoose';

export interface IFile{

    filename: string;
    size: number;
    type: FileObjectType;
    storage: 'S3' | 'Drive';
    fileId: string;
    downloadURL: string | null;
    private: boolean;
    module:string;
    status: number;
    refId?:string;
    base64?:string;
  }
  type FileObjectType =
    | 'application/vnd.ms-excel'
    | 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    | 'application/pdf'
    | 'video/quicktime'
    | 'image/png'
    |'image/jpeg'
    | 'image/jpg'
    | `video/${string}`
    | `image/${string}`;

const FileSchema = new Schema<IFile>({
  // _id: Schema.Types.ObjectId,
  filename: {type: String, required: false},
  size: {type: Number, required: true},
  type: {
    type: String,
    enum: [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/pdf',
      'video/quicktime',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'video/*',
      'image/*',
    ],
  },
  storage: {type: String,
    enum: ['S3', 'Drive'],
    required: false},
  fileId: {type: String, required: false},
  downloadURL: {type: String, required: false},
  private: {type: Boolean, required: false},
  module: {type: String, required: false},
  status: {type: Number, required: true},
  refId: {type: String, required: false},
  base64: {type: String, required: false},

}, {timestamps: true});

export const FileObject = model<IFile>('files', FileSchema);
