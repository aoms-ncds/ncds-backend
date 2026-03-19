import express, {Router} from 'express';
import multer from 'multer';
import fs from 'fs';
// import FileManager from '../../../extras/';


import {sendStandardResponse} from '../../../extras/helpers';
import GoogleDrive from '../../../extras/google/GoogleDrive';
// import UploadFile from '../models/File';
// import mongoose from 'mongoose';

const uploadRouter = Router();

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
uploadRouter.post('/', upload.array('file', 2), async (req: express.Request, res:express.Response, next: express.NextFunction) => {
  console.log('ddk');

  console.log(req.file?.filename, 'ddk');

  if (!req.file) {
    return sendStandardResponse(res, 'INTERNAL SERVER ERROR', {
      error: ' File not found',
      message: 'Something went wrong! Please try again',
    });
  }
  GoogleDrive.uploadFile({
    name: req.file?.filename,
    body: fs.createReadStream(req.file.path),
    mimeType: req.file.mimetype,
    makePublic: true,
    parents: ['1rJ5cw7G-ThlQOf36nzWK7AQn0rwFkEGW'],
  }).then(async () => {
    res.status(200).json({
      data: {
        _id: (new Date()).getTime().toString(),
        name: req.file?.filename,
        type: req.file?.mimetype,
        size: req.file?.size,
        storage: 'Drive',
        fileId: '03v9runt3',
        downloadURL: '',
        private: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      message: 'Successfully uploaded file!',
      result: 'success',
      timeout: 1100,
    });
    // const file1 = `https://drive.google.com/uc?id=${fileID}&export=download`;
    // console.log({file1});
    // try {
    //   const upFile = new UploadFile({
    //     _id: new mongoose.Types.ObjectId(),
    //     name: req.params.expense_id,
    //     size: req.file?.size,
    //     type: req.file?.mimetype,
    //     storage: 'Drive',
    //     fileId: fileID,
    //     downloadURL: file1,
    //     private: true,
    //   });
    //   await upFile.save();
    //   sendStandardResponse(res, 'OK', {
    //     data: upFile,
    //     message: 'Added new file',
    //   });
    // } catch (error) {
    //   next(error);
    //   console.log(error);
  })
    .catch((error) => {
      next(error);
      console.log(error);
      return sendStandardResponse(res, 'INTERNAL SERVER ERROR', {
        data: null,
        success: false,
        error: error,
        message:
        'Something went wrong ! Please try again',
      });
    });
});

uploadRouter.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof multer.MulterError) {
    // handle multer errors
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({
        error: 'File size limit exceeded',
        message: 'File size limit exceeded',
      });
      return;
    }
    next();
  }
});
export default uploadRouter;


