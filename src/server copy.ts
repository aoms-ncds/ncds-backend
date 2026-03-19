import colors from 'colors';
colors.enable();
import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import multer from 'multer';
import morgan from 'morgan';
import cors from 'cors';
import path from 'path';
import fs from 'fs';

dotenv.config();
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is not found in environment variables');
}
const PORT = process.env.PORT || 8080;

const app = express();
app.use(express.urlencoded({extended: true}));
app.use(express.json());
app.use(morgan('dev'));
app.use(cors());

const upload = multer({
  // limits: { fileSize: 10 }, // limit file size to 10 bytes
  storage: multer.diskStorage({
    destination: function(req, file, cb) {
      cb(null, './uploads'); // specify the destination folder here
    },
    filename: function(req, file, cb) {
      cb(null, file.originalname); // use the original filename
    },
  }),
  // TODO: ensure that the files are actually getting deleted from the Temp folder after response is sent
});
app.post('/', upload.single('file'), (req, res) => {
  res.status(200).json({
    data: {
      _id: (new Date()).getTime().toString(),
      name: req.file?.filename,
      type: req.file?.mimetype,
      size: req.file?.size,
      storage: 'Drive',
      fileId: '03v9runt3',
      downloadURL: 'fwe0nvifjr',
      private: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    message: 'Succesfully uploaded file!',
    result: 'success',
    timeout: 1100,
  });
});


// Endpoint for sending the image to the frontend
app.use('/image', (req, res) => {
  const imagePath = path.join(__dirname, 'E-sign');

  // Read the image file as binary data
  fs.readFile(imagePath, (err, data) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error reading image file');
    }

    // Set the appropriate content type
    res.contentType('image/jpeg');

    // Send the image data to the frontend
    res.send(data);
  });
});


app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
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
// app.use((err, req, res, next) => {
//   console.info("Caught error by the error handler!!!");
//   // log the error
//   console.error(err);

//   // set the response status code
//   res.status(err.status || 500);

//   // send the error message as the response body
//   res.send({ error: err.message });
// });

console.log('Trying to conenct to mongodb'.yellow);
mongoose.connect(process.env.MONGO_DB ?? 'mongodb://127.0.0.1:27017/pro910-iet').then(() => {
  console.log('Connected to mongodb'.bgGreen);
})
  .catch(console.log);

app.listen(PORT, () => console.log(`Server running: http://localhost:${PORT}`.bgGreen));
