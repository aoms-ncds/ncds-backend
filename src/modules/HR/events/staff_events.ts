import MyEmitter from '../../../extras/MyEmmitter';
import randomPasswords from '../../users/extras/random_passwords';
import bcryptjs from 'bcryptjs';
import UserPermissions from '../../users/models/UserPermissions';
import mongoose from 'mongoose';
import Staff, {IStaff} from '../models/Staff';
import newStaffEmailTemplate from '../templates/new_staff_email_template';
import staffEmailChangeNotificationTemplate from '../templates/staff_email_change_notification_template';
import commonEvents from '../../../events/common_events';
import Mailer from '../../../extras/Mailer';

const staffEvents = new MyEmitter<{
  create: IStaff;
  update: {
    previousStaff: IStaff;
    newStaff: IStaff;
  };
  activate: IStaff;
  deactivate: IStaff;
  delete: IStaff;
  forceDelete: IStaff;
  login: IStaff;
}>();

staffEvents.on('create', async ({data: staff}) => {
  try {
    // Handle event
    console.log(
      `Staff '${staff.basicDetails.firstName} ${staff.basicDetails?.middleName?? ''} ${staff.basicDetails.lastName}' Created`
        .blue,
    );
    const password = randomPasswords();
    const hash = bcryptjs.hashSync(password, 10);
    const date = new Date();

    const userPermission = await new UserPermissions({
      _id: new mongoose.Types.ObjectId(),
      READ_ACCESS: true,
      READ_WORKERS: true,
      READ_DIVISIONS: true,
    }).save();
    await Staff.updateOne(
      {_id: staff._id},
      {password: hash, permissions: userPermission._id, lastReset: date},
    );

    const welcomeEmail = newStaffEmailTemplate(staff, password);
    await Mailer.sendMail({
      to: staff.basicDetails.email,
      from: `AOMS <${process.env.EMAIL}>`,
      subject: welcomeEmail.subject,
      html: welcomeEmail.body,
    });
    console.log('Sent email!'.blue);
  } catch (error) {
    console.log('Error sending welcome email to newly created user'.red, error);
    if (error instanceof Error) {
      commonEvents.emit('error', {data: error});
    } else {
      commonEvents.emit('unknownError', {data: error});
    }
  }
});

staffEvents.on('update', async ({data: {previousStaff, newStaff}}) => {
  // Handle event
  console.log(
    `Staff '${newStaff.basicDetails.firstName} ${newStaff.basicDetails.middleName?? ''} ${newStaff.basicDetails.lastName}' Updated`
      .blue,
  );
  try {
    if (previousStaff.basicDetails.email != newStaff.basicDetails.email) {
      // Email changed!
      const emailChangedNotification = staffEmailChangeNotificationTemplate(
        newStaff,
        previousStaff.basicDetails.email,
        newStaff.basicDetails.email,
      );
      await Mailer.sendMail({
        to: newStaff.basicDetails.email,
        from: `AOMS <${process.env.EMAIL}>`,
        bcc: previousStaff.basicDetails.email,
        subject: emailChangedNotification.subject,
        html: emailChangedNotification.body,
      });
    }
  } catch (error) {
    console.log('Error sending welcome email to newly created user'.red, error);
    if (error instanceof Error) {
      commonEvents.emit('error', {data: error});
    } else {
      commonEvents.emit('unknownError', {data: error});
    }
  }
});

staffEvents.on('update', (data) => {
  // We can use multiple handlers for the same event!
  // Handle event
  // console.log('Updated staff', data.previousStaff, data.newStaff);
});

staffEvents.on('activate', ({data: staff}) => {
  // Handle event
  console.log(
    `Staff '${staff.basicDetails.firstName} ${staff.basicDetails.middleName ?? ''} ${staff.basicDetails.lastName}' activated`
      .blue,
  );
});

staffEvents.on('deactivate', ({data: staff}) => {
  // Handle event
  console.log(
    `Staff '${staff.basicDetails.firstName} ${staff.basicDetails.middleName ?? ''} ${staff.basicDetails.lastName}' deactivated`
      .blue,
  );
});

staffEvents.on('delete', ({data: staff}) => {
  // Handle event
  console.log(
    `Staff '${staff.basicDetails.firstName} ${staff.basicDetails.middleName ?? ''} ${staff.basicDetails.lastName}' deleted`
      .blue,
  );
});

staffEvents.on('forceDelete', ({data: staff}) => {
  // Handle event
  console.log(
    `Staff '${staff.basicDetails.firstName} ${staff.basicDetails.middleName ?? ''} ${staff.basicDetails.lastName}' Force deleted`
      .blue,
  );
});

staffEvents.on('login', ({data: staff}) => {
  // Handle event
  console.log(
    `Staff '${staff.basicDetails.firstName} ${staff.basicDetails.middleName ?? ''} ${staff.basicDetails.lastName}' Logged in`
      .blue,
  );
});

export default staffEvents;
