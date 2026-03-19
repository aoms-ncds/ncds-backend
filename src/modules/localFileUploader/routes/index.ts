import {Router} from 'express';
import multer from 'multer';
import {Types} from 'mongoose';
import fs from 'fs';
import {sendStandardResponse} from '../../../extras/helpers';
import {FileObject} from '../../fileUploader/models/Files';
// import fs from 'fs';
import authCheck from '../../../extras/auth_check';
import CommonLifeCycleStates from '../../../extras/CommonLifeCycleStates';

const localFileUploaderRouter = Router();


const upload = multer({
  // limits: { fileSize: 10 }, // limit file size to 10 bytes
  storage: multer.diskStorage({
    destination: function(req, file, cb) {
      cb(null, './E-sign'); // specify the destination folder here
    },
    filename: function(req, file, cb) {
      // cb(null, file.originalname); // use the original filename
      // cb(null, Date.now() + '-' + file.originalname);
      const fileId = new Types.ObjectId().toString();
      const filename = `${fileId}${file.originalname.substring(file.originalname.lastIndexOf('.'))}`;
      cb(null, filename);
    },
  }),
  // TODO: ensure that the files are actually getting deleted from the Temp folder after response is sent
});

localFileUploaderRouter.post('/', upload.array('file', 2), async (req, res, next) => {
  try {
    // console.log(req.file);
    if (!req.file) {
      return sendStandardResponse(res, 'INTERNAL SERVER ERROR', {
        error: 'File not found',
        message: 'Something went wrong! Please try again',
      });
    }

    // eslint-disable-next-line no-unused-vars
    // const fileID = await GoogleDrive.uploadFile({
    //   name: req.body.filename,
    //   body: fs.createReadStream(req.file.path),
    //   mimeType: req.file.mimetype,
    //   makePublic: true,
    //   parents: [filePath],
    // });
    const fileId = req.file.filename.substring(0, 24);
    const file = await new FileObject({
      _id: fileId,
      filename: req.body.filename,
      type: req.file.mimetype,
      size: req.file.size,
      storage: 'Drive',
      module: req.body.module, //
      // fileId: new Types.ObjectId(),
      //   downloadURL: `https://drive.google.com/uc?id=${fileID}&export=download`,
      private: false,
      status: CommonLifeCycleStates.ACTIVE,
    }).save();

    sendStandardResponse(res, 'OK', {
      data: file,
      message: 'Successfully file uploaded',
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
});

localFileUploaderRouter.delete(
  '/:fileId',
  authCheck(['READ_ACCESS']),
  async (req, res, next) => {
    try {
      const fileId = req.params.fileId; // Get the file ID from the query parameters
      // eslint-disable-next-line no-constant-condition
      if (false) {
        // TODO: Prevent any file from deleting himself
        next(new Error('A file cannot delete himself!'));
      }
      const file = await FileObject.findOneAndDelete({
        _id: req.params.fileId,
      });

      const filePath = `./E-sign/${fileId}`; // Set the correct file path
      fs.unlink(filePath, (err) => {
        if (err) {
          // Handle errors
          console.error(err);
          return res.status(500).send('Failed to delete the file.');
        }

        // File deleted successfully
        return res.status(200).send('File deleted.');
      });


      if (!file) {
        return next(new Error('file ID Not found'));
      }
      sendStandardResponse(res, 'OK', {
        //   data: file,
        message: 'Successfully deleted file',
      });
      // workerEvents.emit('delete', {data:file});
    } catch (error) {
      next(error);
    }
  },
);

export default localFileUploaderRouter;
