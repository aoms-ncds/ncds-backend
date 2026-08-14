import colors from 'colors';
colors.enable();
import express, {NextFunction, Request, Response} from 'express';
import dotenv from 'dotenv';
dotenv.config();
import mongoose, {Types} from 'mongoose';
import morgan, {token} from 'morgan';
import fs from 'fs';
import cors from 'cors';
import router from './modules/router';
import {sendStandardResponse} from './extras/helpers';
import Google from './extras/google';
import {FormattedCode} from './models/FormattedCode';
import Mailer from './extras/Mailer';
import commonEvents from './events/common_events';
import resetChildSupport, {startResetChildSupport} from './modules/workers/extras/cronJobs/resetChildSupport';
import {incompleteIRONotification} from './modules/IRO/extras/cronJobs/incompleteIRONotification';
import SMSSender from './modules/users/services/sms';
import Transactions from './modules/transactions/models/transactions';
import Child from './modules/workers/models/Child';
import pmaDeduction, {startPmaDeduction} from './modules/workers/extras/cronJobs/PmaDeductionCron';
import {exec, spawn} from 'child_process';
import {S3Client, PutObjectCommand} from '@aws-sdk/client-s3';
// import Division from './modules/divisions/models/Division';
// import Worker from './modules/workers/models/Worker';
// import {ObjectId} from 'mongodb';
// import UserPermissions from './modules/users/models/UserPermissions';
// import IROLifeCycleStates from './modules/IRO/extras/IROLifeCycleStates';
// import IRO from './modules/IRO/models/IRO';
import cron from 'node-cron';
import * as admin from 'firebase-admin';
import User from './modules/users/models/User';
import log from './modules/users/models/Log';
import Spouse from './modules/workers/models/Spouse';
import {insertCategoriesFromXlsx} from '../dataInser';
console.log(process.env.URL, 'uuu'.bgBlue);

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is not found in environment variables');
}
const PORT = process.env.PORT;
if (!PORT) {
  throw new Error('PORT not found in environment variables!');
}
const a=(async ()=>{
  let counter = 1;
  console.log(counter, 'start'.green);

  const users = await User.find();
  for (const user of users) {
    // const impactNo = 'WS' + String(counter).padStart(5, '0');
    const aprilDate = new Date(new Date().getFullYear(), 2, 1); // March 1st (month is 0-indexed)
    console.log(aprilDate, counter, 'Hacking User Data'.green);

    await User.updateOne(
      {_id: user._id},

      {$set: {
        'insurance.dojInsurance': aprilDate,
        // 'insurance.impactNo': impactNo,

      }},
    );

    counter++;
  }
  console.log(counter, 'All users Data Thookkal successfully!'.green);
});

// a();
const app = express();
app.use(express.urlencoded({extended: true}));
app.use(express.json({limit: '20mb'}));
app.use(morgan('dev'));
app.use(cors());
app.use(router);
// const u=async ()=>{
//   const data= await Child.updateMany({supportEnabled: true});
//   console.log(data, 'data');
// };
// u();
// const upload = multer({
//   // limits: { fileSize: 10 }, // limit file size to 10 bytes
//   storage: multer.diskStorage({
//     destination: function(req, file, cb) {
//       cb(null, './uploads'); // specify the destination folder here
//     },
//     filename: function(req, file, cb) {
//       cb(null, file.originalname); // use the original filename
//     },
//   }),
//   // TODO: ensure that the files are actually getting deleted from the Temp folder after response is sent
// });
// app.post('/', upload.single('file'), (req, res) => {
//   res.status(200).json({
//     data: {
//       _id: (new Date()).getTime().toString(),
//       name: req.file?.filename,
//       type: req.file?.mimetype,
//       size: req.file?.size,
//       storage: 'Drive',
//       fileId: '03v9runt3',
//       downloadURL: 'fwe0nvifjr',
//       private: false,
//       createdAt: new Date(),
//       updatedAt: new Date(),
//     },
//     message: 'Succesfully uploaded file!',
//     result: 'success',
//     timeout: 1100,
//   });
// });
// eslint-disable-next-line @typescript-eslint/no-empty-function
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function backupDatabase() {
  const date = new Date().toISOString().slice(0, 10); // Format: YYYY-MM
  const backupPath = `${process.env.BACKUP_DIR}/db-backup-${date}.gz`;
  const fileName = `db-backup-${date}.gz`;

  // Ensure backup directory exists
  const backupDir = process.env.BACKUP_DIR ?? (() => {
    throw new Error('BACKUP_DIR is not defined in environment variables');
  })();
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(process.env.BACKUP_DIR, {recursive: true});
  }
  console.log('🔄 Starting backup for MongoDB...');
  // const mongodumpPath = '/app/mongodump'; // Path to mongodump executable
  // const dumpCommand = `${process.env.MONGO_DUMP} --uri="${process.env.MONGO_DB}" --archive=${backupPath} --gzip`;
  // // Run mongodump command to create a compressed backup
  // // const dumpCommand = `mongodump --uri="${process.env.MONGO_DB}" --archive=${backupPath} --gzip`;

  // exec(dumpCommand, (error, stdout, stderr) => {
  //   if (error) {
  //     console.error(`❌ Backup failed: ${error.message}`);
  //     return;
  //   }
  //   console.log(`✅ Backup completed: ${backupPath}`);

  // Upload to Google Drive using rclone
  // uploadToDrive(backupPath);
  // });
  uploadToS3('dbbackup-iet', backupPath, fileName);
}
const test = async () => {
  try {
    const token = 'dxa04PSQufPxrNHb33Xu0o:APA91bFcBfiEqI14a9SEGfICJ9tdI9bnEFrI0X7MO9i6ICFgrvld_LHrpQy0yAbKVRUuQb0E7oI9GZo9sta8EUckQNSJ-QEG2kKut5B5NpGZMVWhqWkgjpI';
    const response = await admin.messaging().send({
      token,
      notification: {
        title: 'HEY',
        body: 'I AM SHIBIN🫰',
      },
    });
    console.log('Successfully sent message:', response);
  } catch (error) {
    console.error('FCM Send Error:', error);
  }
};
// test();
if (!process.env.S3_ACCESS_KEY|| !process.env.S3_SECRET_KEY) {
  throw new Error('S3_ACCESS_KEY or S3_SECRET_KEY is not defined in environment variables');
}

const s3: any = new S3Client({
  region: 'ap-south-1', // Change to your AWS region
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY, // Use environment variables
    secretAccessKey: process.env.S3_SECRET_KEY,
  },
});
async function uploadToS3(bucketName: string, filePath: fs.PathOrFileDescriptor, fileName: string) {
  try {
    const fileContent = fs.readFileSync(filePath);

    const params = {
      Bucket: bucketName,
      Key: fileName,
      Body: fileContent,
      ContentType: 'application/gzip',
    };

    // Upload using AWS SDK v3
    const command = new PutObjectCommand(params);
    await s3.send(command);

    console.log(`✅ File uploaded to S3: ${fileName}`);
  } catch (error) {
    console.error('❌ Error uploading file:', error);
  }
}
// Example usage
// backupDatabase();
cron.schedule('0 0 1 * * *', backupDatabase);
function restoreMongoDB(filePath: any, dbName: any) {
  const restore = spawn('mongorestore', ['--gzip', `--archive=${filePath}`, `--db=${dbName}`]);

  restore.stdout.on('data', (data: any) => console.log(`stdout: ${data}`));
  restore.stderr.on('data', (data: any) => console.error(`stderr: ${data}`));
  restore.on('close', (code: number) => {
    if (code === 0) console.log('✅ MongoDB restore completed successfully.');
    else console.error('❌ MongoDB restore failed.');
  });
}
async function updateTransactionStatus() {
  try {
    // Ensure the database connection is ready

    // Perform aggregation to find matching transactions
    const matchingTransactions = await Transactions.aggregate([
      {
        $lookup: {
          from: 'particulars', // Name of the referenced collection
          localField: 'particulars', // Field in transactions referencing particulars
          foreignField: '_id', // The `_id` field in particulars
          as: 'particularsData', // Alias for the joined data
        },
      },
      {
        $match: {
          'division': new mongoose.Types.ObjectId('654601e5a8cb57f666e6008d'),
          'IRODate': {
            $gte: new Date('2024-04-01T00:00:00.000+00:00'), // January 1st
            $lte: new Date('2024-07-31T23:59:59.999+00:00'), // January 31st
          },
          'particularsData.mainCategory': 'Maintenance of Priest & Preachers',
          'particularsData.subCategory1': 'Support',
          'particularsData.subCategory2': 'Assosiates Support',
        },
      },
    ]);

    // Update each matched transaction
    const updatePromises = matchingTransactions.map((transaction: { _id: any; }) => {
      console.log(transaction, 'transaction');
      return Transactions.updateOne(
        {_id: transaction._id},
        {$set: {status: 220}},
      );
    });
    // Wait for all updates to complete
    const results = await Promise.all(updatePromises);
    console.log(results, 'results66');

    // Return success message
    return {
      success: true,
      message: `${results.length} transactions updated successfully.`,
    };
  } catch (error) {
    // Handle errors
    return {
      success: false,
      message: 'An error occurred while updating transactions.',
    };
  }
}
// updateTransactionStatus();

app.get('/run-cron', (req, res)=>{
  res.send('Cron Running... Korach neram wait cheyy🌚');
  // resetChildSupport();
  // pmaDeduction();
  backupDatabase();
});
// http://localhost:8002/run-cron cron test url
app.use((error: Error, req: Request, res: Response, next: NextFunction): void => {
  console.info('Caught error by the error handler!!!');
  // log the error
  commonEvents.emit('error', {data: error});
  sendStandardResponse(res, 'INTERNAL SERVER ERROR', {
    error: error.message, message: 'Oops! Something went wrong! We\'re working on it!',
  });
});

app.use((req: Request, res: Response) => {
  commonEvents.emit('error', {data: new Error(`404 Found for ${req.url}`)});
  sendStandardResponse(res, 'NOT FOUND', {
    error: '404 Not Found (REST API Endpoint not implemented)',
    message: 'Oops! Something went wrong! We\'re working on it!',
  });
});
incompleteIRONotification();
startResetChildSupport();
startPmaDeduction(); // Start the PMA deduction cron job
// pmaDeduction();
// resetChildSupport();
// Enable Mongoose debugging
// mongoose.set('debug', true);
// console.log(mongoose.version);

// const x=async ()=>{
//   const divisions = await Division.find({});
//   const coordinatorNames = divisions.map((d) => d.details.coordinator?.name);

//   // console.log(coordinatorNames, 'coordinatorNames');

//   const workers = await Worker.find({'_id': {$in: coordinatorNames}});

//   // console.log(workers.map((id)=>id._id), 'workers');
// };
// x();
const y=async ()=>{
  await insertCategoriesFromXlsx('./data.xlsx', {
    manageConnection: false, // if your app already has mongoose connected
    wipe: false, // append instead of wiping the collection first
  });
};
// y();
console.log('Trying to conenct to mongodb'.yellow);
mongoose.connect(process.env.MONGO_DB ?? 'mongodb://127.0.0.1:27017/pro910-iet').then(async () => {
  console.log('Connected to mongodb'.bgGreen);
  if (!await FormattedCode.findOne({})) {
    FormattedCode.create({
      _id: new Types.ObjectId(),
      staffCode: 0,
      workerCode: 0,
      spouseCode: 0,
      childCode: 0,
      divCode: 0,
      FRCode: 0,
      IROCode: 0,
      applicationCode: 0,
    })
      .then(() => console.log('Created FormattedCode document'.bgBlue))
      .catch((error) => commonEvents.emit('error', error));
  }
  // await IRO.updateOne({_id: '654a85d423e738d111636fdb'}, {status: IROLifeCycleStates.WAITING_FOR_ACCOUNTS_MNGR, sanctionedBank: 'Personal Bank'});

  // await User.updateMany({}, {
  //   'supportStructure.supportEnabled': true,
  // }).then(()=>console.log('Updated'));

  // console.log('🚀 ~ file: server.ts:78 ~ mongoose.connect ~ u:', u);
})
  .catch((error) => commonEvents.emit('error', error));
app
  .listen(PORT, () => console.log(`Server running: http://localhost:${PORT}`.bgGreen))
  .on('error', (error) => commonEvents.emit('error', {data: error}));


Google.Gmail.initialize(Google.Auth.getAuth()); // GoogleMail
Google.Drive.initialize(Google.Auth.getAuth()); // GoogleMail

// const useMockMailService = process.env.MOCK_EMAIL_SERVER !== 'false' || false;
// console.log(
//   (
//     useMockMailService ?
//       'Using mock email service for sending any emails!' :
//       'Using actual email service for sending any emails!'
//   ).bgGreen,
// );

// // const useMockSMSService = process.env.MOCK_SMS_SERVICE !== 'false' || false;

// // // console.log((useMockSMSService ? 'Using mock SMS service for sending any SMSs!' : 'Using actual SMS service for sending any SMSs!').bgGreen);

// // // SMSSender.set('mockSending', useMockSMSService); //sms disabled


Mailer.use('Gmail');
