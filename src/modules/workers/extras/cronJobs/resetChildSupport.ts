import cron from 'node-cron';
import Child from '../../models/Child';
import ChildSupport from '../../models/childSupport';
import User from '../../../users/models/User';
import {IUser} from '../../../users/extras/user_types';
import Message from '../../../../models/Messages';
import mongoose from 'mongoose';
import MessagingService from '../../../../extras/Messaging';
import {IDivision} from '../../../divisions/models/Division';
import ChildSupportAge from '../../models/childSupportAge';
import childeupdateTemplate from '../../../HR/templates/child_update_tempalte';
import Mailer from '../../../../extras/Mailer';


export default async function resetChildSupport() {
  console.log('Cron job is running!');

  const newAge = await ChildSupportAge.findOne({});

  console.log(newAge?.age, 'newAge');

  // const ageThreshold = 17; // Set the age threshold
  const ageThreshold = newAge?.age; // Set the age threshold
  if (ageThreshold) {
    const currentDate = new Date();
    const cutoffDate = new Date(
      currentDate.getFullYear() - ageThreshold,
      currentDate.getMonth(),
      currentDate.getDate(),
    );

    console.log(cutoffDate, 'cutoffDate');

    const level0ChildSupport = await ChildSupport.findOne({name: 'Level 0'});
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
          'permissions.MANAGE_WORKER': true,
        },
      },
    ])
      .exec()
      .then(async (usersWithWriteAccessToHR: IUser[]) => {
      // console.log(usersWithWriteAccessToBudgetCode);
        const recipients: string[] = usersWithWriteAccessToHR.map((user) => {
          return user._id;
        });

        console.log(level0ChildSupport, 'ss');
        const children = await Child.find({
          dateOfBirth: {$lt: cutoffDate},
          childSupport: {$ne: level0ChildSupport?._id},
          ageOverRide: {$ne: true},
        }).populate('division');
        console.log(children, 'children321');
        children.map(async (child) => {
          await Child.findByIdAndUpdate(child, {
            childSupport: level0ChildSupport?._id,
          });
          console.log(child.firstName, child.lastName, 'Sent email to child!'.blue);
          // console.log((child as unknown as IChild).division);
          // const recipients:string[] = ...userIds, (((child as unknown as IChild).division as unknown as IDivision).details.coordinator?.name as unknown as IUser)._id]??[]:[];
          new Message({
            _id: new mongoose.Types.ObjectId(),
            title: 'Child Support Updated',
            body: `Child Support reset for ${child.firstName} ${child.firstName}, ${child.childCode}`,
            ref_url: `${process.env.URL}/users/worker/${child.childOf}`,
            recipients: recipients.map((item) => ({user: item, read: false})),
            type: 'push',
            division: (child.division as unknown as IDivision).details.name,
          })
            .save()
          // eslint-disable-next-line @typescript-eslint/no-empty-function
            .then((result) =>{})
            .catch((err) => {
              console.log(err);
            });
          console.log('sending message...');
          MessagingService.send('push', recipients, {
            title: 'Child Support Updated',
            body: `Child Support reset for ${child.firstName} ${child.lastName}, ${child.childCode}`,
            referenceURL: `${process.env.URL}/users/worker/${child.childOf}`,
          }).catch((error) => {
            console.log(error);
          });
          const welcomeEmail = childeupdateTemplate(child);
          console.log('Test...', `AOMS <${process.env.EMAIL}>`);
          await Mailer.sendMail({
            to: child?.emailId,
            from: `AOMS <${process.env.EMAIL}>`,
            subject: welcomeEmail.subject,
            html: welcomeEmail.body,
          });
          console.log('Sent email to child!'.blue);
        });
        console.log(
          '🚀 ~ file: resetChildSupport.ts:24 ~ resetChildSupport ~ children:',
          children.length,
        );
      });
    // Find children of age greater than 17
  }
  // console.log(children.l, 'child records updated');
}

export const startResetChildSupport = async () => {
  // resetChildSupport();
  // await Child.updateMany(
  //   {},
  //   {
  //     $set: {
  //       dateOfBirth: new Date('2005-07-09T18:30:00.000+00:00'),
  //       childSupport: '647f34b4b7102b8026b29518', division: new Types.ObjectId('6475b33f424c132d3287e558')}},
  // //  Update the childSupport field to null
  // );
  cron.schedule('0 0 1 * * *', resetChildSupport);
};
