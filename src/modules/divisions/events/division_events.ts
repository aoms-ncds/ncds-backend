import Message from '../../../models/Messages';
import mongoose from 'mongoose';
import commonEvents from '../../../events/common_events';
import Mailer from '../../../extras/Mailer';
import MessagingService from '../../../extras/Messaging';
import MyEmitter from '../../../extras/MyEmmitter';
import randomPasswords from '../../users/extras/random_passwords';
import {IDivision} from '../models/Division';
import bcryptjs from 'bcryptjs';
import Worker, {IWorker} from '../../workers/models/Worker';
import {IUser} from '../../users/extras/user_types';

import newCoordinatorEmailTemplate from '../../HR/templates/new_coordinator_template';
const divisionEvents = new MyEmitter<{
  create: IDivision;
  update: {
    previousDivision: IDivision;
    newDivision: IDivision;
  };
  activate: IDivision;
  deactivate: IDivision;
  delete: IDivision;
  forceDelete: IDivision;
}>();

divisionEvents.on('create', (division) => {
  console.log('Created division', division);
});

divisionEvents.on(
  'update',
  async ({data: {previousDivision, newDivision}}) => {
    const worker = newDivision?.details?.coordinator?.name as unknown as
      | IWorker
      | IUser;
    try {
      // Handle event
      // console.log(`Worker '${worker?.basicDetails?.firstName} ${worker?.basicDetails?.lastName}' approved`.blue);
      if (previousDivision.details.coordinator?.name?.id != newDivision.details.coordinator?.name?.id) {
        console.log('call');

        const password = randomPasswords();
        const hash = bcryptjs.hashSync(password, 10);
        // const userPermission = await new UserPermissions({_id: new mongoose.Types.ObjectId()}).save();
        await Worker.updateOne({_id: worker?._id}, {password: hash});

        const welcomeEmail = newCoordinatorEmailTemplate(
        worker as IWorker,
        password,
        );
        console.log('Test...', `AOMS <${process.env.EMAIL}>`);
        await Mailer.sendMail({
          to: worker?.basicDetails?.email,
          from: `AOMS <${process.env.EMAIL}>`,
          subject: welcomeEmail.subject,
          html: welcomeEmail.body,
        });
        console.log(worker?.createdBy, 'Sent email!'.blue);

        new Message({
          _id: new mongoose.Types.ObjectId(),
          title: 'Coordinator Added',
          body: `Data of user ${worker?.basicDetails?.firstName}, ${worker?.basicDetails?.middleName ?? ''} ${newDivision.details.name.trim()} has been Added`,
          ref_url: `${process.env.URL}/divisions`,
          recipients: [{user: worker?.createdBy, read: false}],
          division: newDivision.details.name.trim(),
          type: 'push',
        })
          .save()
        // eslint-disable-next-line @typescript-eslint/no-empty-function
          .then((result) => {})
          .catch((err) => {
            console.log(err);
          });
        console.log(worker?.createdBy?._id, 'sending message...');
        MessagingService.send('push', [worker?.createdBy?._id], {
          title: 'Coordinator Added ',
          body: `Data of user ${worker?.basicDetails?.firstName}, ${worker?.basicDetails?.middleName ?? ''} ${newDivision.details.name.trim()} has been Added`,
          referenceURL: `${process.env.URL}/workers/manage`,
        }).catch((error) => {
          console.log(error);
        });
      } else {
        console.log('Not Matching'.green);
      }
    } catch (error) {
      console.log(
        'Error sending welcome email to newly approved worker'.red,
        error,
      );
      if (error instanceof Error) {
        commonEvents.emit('error', {data: error});
      } else {
        commonEvents.emit('unknownError', {data: error});
      }
    }
  },
);

// divisionEvents.on('update', ({data: {previousDivision, newDivision}}) => { // We can use multiple handlers for the same event!
//   console.log('Updated division', previousDivision, newDivision);
// });

divisionEvents.on('activate', (data) => {
  console.log('Activated division', data);
});

divisionEvents.on('deactivate', (data) => {
  console.log('Deactivated division', data);
});

divisionEvents.on('delete', (division) => {
  console.log('Deleted division', division);
});

divisionEvents.on('forceDelete', (division) => {
  console.log('Force deleted division', division);
});

export default divisionEvents;
