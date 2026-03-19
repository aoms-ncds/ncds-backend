import bcryptjs from 'bcryptjs';
import MyEmitter from '../../../extras/MyEmmitter';
import randomPasswords from '../../users/extras/random_passwords';
import Worker, {IWorker} from '../models/Worker';
import UserPermissions from '../../users/models/UserPermissions';
import mongoose from 'mongoose';
import Mailer from '../../../extras/Mailer';
import workerApprovedEmailTemplate from '../../HR/templates/new_worker_email_template';
import commonEvents from '../../../events/common_events';
import Message from '../../../models/Messages';
import MessagingService from '../../../extras/Messaging';
import User from '../../users/models/User';
import {IUser} from '../../users/extras/user_types';
import Division, {IDivision} from '../../divisions/models/Division';
// import {IDivision} from '../../divisions/models/Division';

const workerEvents = new MyEmitter<{
  create: IWorker,
  update: {
    previousWorker: IWorker;
    newWorker: IWorker;
  },
  activate: IWorker,
  approve: IWorker,
  reject: IWorker,
  deactivate: IWorker,
  delete: IWorker;
  login: IWorker;
}>();

workerEvents.on('create', (event) => {
  User.aggregate([
    {
      $lookup: {
        from: 'user_permissions',
        localField: 'permissions',
        foreignField: '_id',
        as: 'permissions',
      },
    },
    {
      $match: {
        // 'permissions.MANAGE_WORKER': true,
        'permissions.MANAGE_WORKER': true,
      },
    },
  ])
    .exec()
    .then(async (usersWithWriteAccessToWorker: IUser[]) => {
      // console.log(usersWithWriteAccesssToBudgetCode);
      const userIds = usersWithWriteAccessToWorker.map((user) => {
        return user._id;
      });
      // User.findById(event.initiator?._id).populate('division').then((curUser)=>{
      //   const curUserDiv=(curUser?.division as unknown as IDivision).details?.name.trim();
      const division = await Division.findById(event.data.division);
      console.log(division?.details.name.trim());


      console.log(event, userIds, 'event');
      new Message({
        _id: new mongoose.Types.ObjectId(),
        title: 'Worker Application Request',
        division: division?.details.name.trim(),
        body: `A new worker application from  ${division?.details.name.trim()} has been raised `,
        ref_url: `${process.env.URL}/workers/approve`,
        recipients: userIds.map((item) => ({user: item, read: false})),
        type: 'push',
      }).save()
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        .then((result) => {

        }).catch((err) => {
          console.log(err);
        });
      console.log('sending message...');
      MessagingService.send('push', userIds, {
        title: 'Worker Application Request',
        body: `A new worker application from  ${division?.details.name.trim()} has been raised `,
        referenceURL: `${process.env.URL}/workers/manage`,
      })
        .catch((error) => {
          console.log(error);
        });
    });
});


workerEvents.on('approve', async ({data: worker}) => {
  // Handle event
  try {
    // Handle event
    console.log(`Worker '${worker.basicDetails.firstName} ${worker.basicDetails?.middleName?? ''} ${worker.basicDetails.lastName}' approved`.blue);
    const password = randomPasswords();
    const hash = bcryptjs.hashSync(password, 10);
    const date = new Date();

    console.log('Sent email!'.blue);
    const userPermission = await new UserPermissions({_id: new mongoose.Types.ObjectId()}).save();
    await Worker.updateOne({_id: worker._id}, {password: hash, permissions: userPermission._id, lastReset: date});

    const welcomeEmail = workerApprovedEmailTemplate(worker, password);
    await Mailer.sendMail({to: worker.basicDetails.email, subject: welcomeEmail.subject, html: welcomeEmail.body, from: `AOMS <${process.env.EMAIL}>`});
    console.log('Sent email!'.blue);
    const div = await Division.findOne({_id: worker?.division});
    console.log(worker?.createdBy, 'disv');

    new Message({
      _id: new mongoose.Types.ObjectId(),
      title: 'Worker Approved',
      body:
        `Data of user ${worker.workerCode} has been approved`,
      ref_url: `${process.env.URL}/workers/manage`,
      type: 'push',
      recipients: [{user: worker?.createdBy, read: false}],
      division: div?.details.name.trim(),
    }).save()
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      .then((result) => {

      }).catch((err) => {
        console.log(err);
      });
    console.log('sending message...');
    MessagingService.send('push', [worker.createdBy?._id], {
      title: 'Worker approved ',
      body: `Data of user ${worker.workerCode} has been approved`,
      referenceURL: `${process.env.URL}/workers/manage`,
    })
      .catch((error) => {
        console.log(error);
      });
  } catch (error) {
    console.log('Error sending welcome email to newly approved worker'.red, error);
    if (error instanceof Error) {
      commonEvents.emit('error', {data: error});
    } else {
      commonEvents.emit('unknownError', {data: error});
    }
  }
});

workerEvents.on('update', ({data: {previousWorker, newWorker}}) => {
  // Handle event
  console.log('Updated Worker', previousWorker, newWorker);
});

workerEvents.on('update', ({data}) => { // We can use multiple handlers for the same event!
  // Handle event
  console.log('Updated Worker', data.previousWorker, data.newWorker);
});

workerEvents.on('activate', (data) => {
  // Handle event
  console.log('Activated Worker', data);
});


workerEvents.on('reject', async (event) => {
  const division = await Division.findById(event.data.division);
  new Message({
    _id: new mongoose.Types.ObjectId(),
    title: 'Data send back',

    body:
      `Data of user ${event.data.workerCode} has been sent back`,
    ref_url: `${process.env.URL}/workers/reject`,
    recipients: [event.data.createdBy?._id],
    division: division?.details.name,

    type: 'push',
  }).save()
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    .then((result) => {

    }).catch((err) => {
      console.log(err);
    });
  console.log('sending message...');
  MessagingService.send('push', [event.data.createdBy?._id], {
    title: 'Data sent back ',
    body: `Data of user ${event.data.workerCode} has been sent back`,
    referenceURL: `${process.env.URL}/workers/manage`,
  })
    .catch((error) => {
      console.log(error);
    });
});

workerEvents.on('deactivate', (data) => {
  // Handle event
  console.log('Deactivated Worker', data);
});

workerEvents.on('delete', (worker) => {
  // Handle event
  console.log('Deleted Worker', worker);
});

workerEvents.on('login', ({data: worker}) => {
  // Handle event
  // console.log(`Worker '${worker.basicDetails.firstName} ${worker.basicDetails.middleName?? ''} ${worker.basicDetails.lastName}' Logged in`.blue);
});

export default workerEvents;
