import express, {Router} from 'express';
import multer from 'multer';
import GoogleDrive from '../../../extras/google/GoogleDrive';
import {sendStandardResponse} from '../../../extras/helpers';
import {FileObject, IFile} from '../models/Files';
import fs from 'fs';
import authCheck from '../../../extras/auth_check';
import CommonLifeCycleStates from '../../../extras/CommonLifeCycleStates';
import FilePath from '../extras/fileConfig';
import IROEvents from '../../IRO/events/IRO_events';

const fileUploaderRouter = Router();

const upload = multer({
  // limits: { fileSize: 10 }, // limit file size to 10 bytes
  storage: multer.diskStorage({
    // destination: function(req, file, cb) {
    //   cb(null, './uploads'); // specify the destination folder here
    // },
    // filename: function(req, file, cb) {
    //   cb(null, file.originalname); // use the original filename
    // },
  }),
  // TODO: ensure that the files are actually getting deleted from the Temp folder after response is sent
});

fileUploaderRouter.post(
  '/',
  upload.single('file'),
  async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    // console.log(req.body);
    if (!req.file) {
      return sendStandardResponse(res, 'INTERNAL SERVER ERROR', {
        error: ' File not found',
        success: false,
        message: 'Something went wrong! Please try again',
      });
    }

    const filePath =
      req.body.module == 'Applications' ?
        FilePath.Application :
        req.body.module == 'IRO/ReleaseAmount' ?
          FilePath.IRO_ReleaseAmount :
          req.body.module == 'IRO/eSignature' ?
            FilePath.IRO_Signature :
            req.body.module == 'IRO/Reconciliation' ?
              FilePath.IRO_Reconciliation :
              req.body.module == 'FR/Particulars' ?
                FilePath.FR_Particulars :
                req.body.module == 'HR/Staff' ?
                  FilePath.Staff_Documents :
                  req.body.module == 'Division/eSignature' ?
                    FilePath.Division_ESignature :
                    req.body.module == 'Settings/eSignature' ?
                      FilePath.Settings_ESignature :
                      FilePath.Default;
    GoogleDrive.uploadFile({
      name: req.body.filename,
      body: fs.createReadStream(req.file.path),
      mimeType: req.file.mimetype,
      makePublic: true,
      parents: [filePath],
    })
      .then(async (fileID) => {
        const file = await new FileObject({
          filename: req.body.filename,
          type: req.file?.mimetype,
          size: req.file?.size,
          storage: 'Drive',
          module: req.body.module,
          fileId: fileID,
          downloadURL: `https://drive.google.com/${req.file?.mimetype=='image/png'||
          req.file?.mimetype=='image/jpeg'|| req.file?.mimetype=='image/jpg'?'thumbnail':'uc'}?id=${fileID}&export=download`,
          private: false,
          status: CommonLifeCycleStates.ACTIVE,
        });
        // console.log(req.body.module);
        if (
          (req.body.module === 'Division/eSignature' ||
            req.body.module === 'IRO/eSignature' ||
            req.body.module === 'Settings/eSignature') &&
          req.file
        ) {
          file.base64 = fs.readFileSync(req.file.path).toString('base64');
          // console.log('base64');
        }
        file.save();
        if (req.body.iroId) {
          IROEvents.emit('billUpload', {data: req.body.iroId});
        }
        return sendStandardResponse<IFile | null>(res, 'OK', {
          data: file,
          success: true,
          message: 'Successfully file Uploaded',
        });
      })
      .catch((error) => {
        next(error);
        console.log(error);
        // return sendStandardResponse(res, 'INTERNAL SERVER ERROR', {
        //   data: null,
        //   success: false,
        //   error: error,
        //   message: 'Something went wrong ! Please try again',
        // });
      });
  },
);

fileUploaderRouter.patch(
  '/:fileId',
  authCheck(['READ_ACCESS']),
  async (req, res, next) => {
    try {
      const newFile = await FileObject.findByIdAndUpdate(
        req.params.fileId,
        {filename: req.body.newName},
        {new: true},
      );
      if (!newFile) {
        return next(new Error('File ID Not found'));
      }

      sendStandardResponse(res, 'OK', {
        message: 'Successfully updated File',
      });
    } catch (error) {
      next(error);
    }
  },
);

fileUploaderRouter.get(
  '/:fileId',
  authCheck(['READ_ACCESS']),
  async (req, res, next) => {
    try {
      const file = await FileObject.findById(req.params.fileId);
      return sendStandardResponse<IFile | null>(res, 'OK', {
        data: file,
        success: true,
        message: 'Successfully file fetched',
      });


      // workerEvents.emit('delete', {data:file});
    } catch (error) {
      next(error);
    }
  },
);

fileUploaderRouter.delete(
  '/:fileId',
  authCheck(['READ_ACCESS']),
  async (req, res, next) => {
    try {
      // eslint-disable-next-line no-constant-condition
      if (false) {
        // TODO: Prevent any file from deleting
        next(new Error('A file cannot delete himself!'));
      }
      const file :any= await FileObject.findOneAndDelete({
        _id: req.params.fileId,
      });
      if (!file) {
        return next(new Error('file ID Not found'));
      }

      if (file) {
        GoogleDrive.deleteFile(file?.fileId)
          .then(() =>
            sendStandardResponse(res, 'OK', {
              //   data: file,
              message: 'Successfully deleted file',
            }),
          )
          .catch((error) => {
            sendStandardResponse(res, 'INTERNAL SERVER ERROR', {
              error: ' File not found',
              message: 'Something went wrong! Please try again',
            });
            console.log(error);
          });
      }

      // workerEvents.emit('delete', {data:file});
    } catch (error) {
      next(error);
    }
  },
);

fileUploaderRouter.patch(
  '/:fileId/:operation',
  authCheck(['READ_ACCESS']),
  async (req, res, next) => {
    try {
      if (!['approve', 'reject'].includes(req.params.operation)) {
        next(
          new Error(
            'Only approve/reject operations are allowed by this API endpoint!',
          ),
        );
      }
      const file = await FileObject.findByIdAndUpdate(
        req.params.fileId,
        {
          status:
            req.params.operation === 'approve' ?
              CommonLifeCycleStates.APPROVED :
              CommonLifeCycleStates.REJECTED,
        },
        {new: true},
      );
      if (!file) {
        return next(new Error('File ID Not found'));
      }
      sendStandardResponse(res, 'OK', {
        //   data: file,
        message: `File ${
          req.params.operation == 'approve' ? 'Approved' : 'Rejected'
        }`,
      });
    } catch (error) {
      next(error);
    }
  },
);

export default fileUploaderRouter;
