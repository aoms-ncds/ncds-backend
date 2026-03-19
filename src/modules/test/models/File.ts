import mongoose, {Schema} from 'mongoose';
import {IFile} from '../extras/FileType';

const FileSchema=new Schema<IFile>({
  name: {type: String, required: true},
  size: {type: Number, required: true},
  type: {
    type: String,
    required: true,
    validate: {
      validator: function(value: string) {
        if (value.startsWith('video/')) {
          return value.match(/^video\/[^/]+$/);
        } else if (value.startsWith('image/')) {
          return value.match(/^image\/[^/]+$/);
        } else {
          return [
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/pdf',
            'video/quicktime',
            'image/png',
          ].includes(value);
        }
      },
      message: 'Invalid file type',
    },
  },
  storage: {
    type: String,
    enum: ['S3',
      'Drive'],
    required: false,
  },
  fileId: {type: String, required: true},
  downloadURL: {type: String, required: true},
  private: {type: Boolean, required: true},

});


const UploadFile = mongoose.model<IFile>('files', FileSchema);

export default UploadFile;
