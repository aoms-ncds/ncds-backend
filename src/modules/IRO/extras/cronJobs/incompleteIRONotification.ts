/* eslint-disable @typescript-eslint/no-empty-function */
import cron from 'node-cron';
import IRO from '../../models/IRO';
import Message from '../../../../models/Messages';
import mongoose from 'mongoose';
import MessagingService from '../../../../extras/Messaging';
import {IUser} from '../../../users/extras/user_types';
import User from '../../../users/models/User';
import moment from 'moment';
import IROLifeCycleStates from '../IROLifeCycleStates';
import {IFR} from '../../../FR/models/FR';
import {IDivision} from '../../../divisions/models/Division';
async function incompleteIROFor30() {
  console.log('Cron job is running!');

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
        'permissions.WRITE_STAFFS': true,
      },
    },
  ])
    .exec()
    .then(async (usersWithWriteAccessToHR: IUser[]) => {
      // console.log(usersWithWriteAccessToBudgetCode);
      const userIds: string[] = usersWithWriteAccessToHR.map((user) => {
        return user._id;
      });
      const thirtyDaysAgo = moment.utc().subtract(30, 'days').startOf('day').toDate();
      const iros = await IRO.find({
        status: IROLifeCycleStates.AMOUNT_RELEASED,
        updatedAt: thirtyDaysAgo,
      }).populate('FR').populate({
        path: 'FR',
        populate: {
          path: 'createdBy',
          model: 'users',
        },
      }).populate('division');
      if (iros) {
        iros.map((iro) => {
          const recipients = [...userIds, (iro.FR as unknown as IFR).createdBy._id];

          new Message({
            _id: new mongoose.Types.ObjectId(),
            title: 'Reconciliation status is "Incomplete" after 30 days',

            body:
              `Kindly submit the bills associated with ${(iro.FR as unknown as IFR).FRno} raised on ${moment((iro.FR as unknown as IFR).FRdate).format('DD-MMM-YYYY')} `,
            ref_url: `${process.env.URL}/iro/${iro._id}`,
            recipients: recipients.map((item) => ({user: item, read: false})),
            type: 'push',
            division: (iro.division as IDivision).details.name,

          }).save()
            .then((result) => {

            }).catch((err) => {
              console.log(err);
            });
          console.log('sending message...');
          MessagingService.send('push', recipients, {
            title: 'Reconciliation status is "Incomplete"',
            body: `Kindly submit the bills associated with ${(iro.FR as unknown as IFR).FRno} raised on ${moment((iro.FR as unknown as IFR).FRdate).format('DD-MMM-YYYY')} `,
            referenceURL: `${process.env.URL}/iro/${iro._id}`,
          })
            .catch((error) => {
              console.log(error);
            });
        });
      }
    });
}
async function incompleteIROFor60() {
  console.log('Cron job is running!');
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
        'permissions.WRITE_STAFFS': true,
      },
    },
  ])
    .exec()
    .then(async (usersWithWriteAccessToHR: IUser[]) => {
      // console.log(usersWithWriteAccesssToBudgetCode);
      const userIds: string[] = usersWithWriteAccessToHR.map((user) => {
        return user._id;
      });
      const sixtyDaysAgo = moment.utc().subtract(60, 'days').startOf('day').toDate();
      // console.log(sixtyDaysAgo);
      const iros = await IRO.find({
        status: IROLifeCycleStates.AMOUNT_RELEASED,
        updatedAt: sixtyDaysAgo,
      }).populate('FR').populate({
        path: 'FR',
        populate: {
          path: 'createdBy',
          model: 'users',
        },
      });
      if (iros) {
        // console.log(iros);
        iros.map((iro) => {
          const recipients = [...userIds, (iro.FR as unknown as IFR).createdBy._id];
          // console.log(recipients);
          new Message({
            _id: new mongoose.Types.ObjectId(),
            title: 'Reconciliation status is "Incomplete" after 30 days',

            body:
              `Kindly submit the bills associated with ${(iro.FR as unknown as IFR).FRno} raised on ${moment((iro.FR as unknown as IFR).FRdate).format('DD-MMM-YYYY')} `,
            ref_url: `${process.env.URL}/iro/${iro._id}`,
            recipients: recipients.map((item) => ({user: item, read: false})),
            type: 'push',
            division: (iro.division as IDivision).details.name,


          }).save()
            .then((result) => {

            }).catch((err) => {
              console.log(err);
            });
          console.log('sending message...');
          MessagingService.send('push', recipients, {
            title: 'Reconciliation status is "Incomplete"',
            body: `Kindly submit the bills associated with ${(iro.FR as unknown as IFR).FRno} raised on ${moment((iro.FR as unknown as IFR).FRdate).format('DD-MMM-YYYY')} `,
            referenceURL: `${process.env.URL}/iro/${iro._id}`,
          })
            .catch((error) => {
              console.log(error);
            });
        });
      }
    });
}
async function incompleteIROFor90() {
  console.log('Cron job is running!');
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
        'permissions.WRITE_STAFFS': true,
      },
    },
  ])
    .exec()
    .then(async (usersWithWriteAccessToHR: IUser[]) => {
      // console.log(usersWithWriteAccesssToBudgetCode);
      const userIds: string[] = usersWithWriteAccessToHR.map((user) => {
        return user._id;
      });
      const ninetyDaysAgo = moment.utc().subtract(90, 'days').startOf('day').toDate();
      // console.log(ninetyDaysAgo);
      const iros = await IRO.find({
        status: IROLifeCycleStates.AMOUNT_RELEASED,
        updatedAt: ninetyDaysAgo,
      }).populate('FR').populate({
        path: 'FR',
        populate: {
          path: 'createdBy',
          model: 'users',
        },
      });
      if (iros) {
        // console.log(iros);
        iros.map((iro) => {
          const recipients = [...userIds, (iro.FR as unknown as IFR).createdBy._id];
          // console.log(recipients);
          new Message({
            _id: new mongoose.Types.ObjectId(),
            title: 'Reconciliation status is "Incomplete" after 90 days',

            body:
              `Kindly submit the bills associated with ${(iro.FR as unknown as IFR).FRno} raised on ${moment((iro.FR as unknown as IFR).FRdate).format('DD-MMM-YYYY')} `,
            ref_url: `${process.env.URL}/iro/${iro._id}`,
            recipients: recipients.map((item) => ({user: item, read: false})),
            type: 'push',
            division: (iro.division as IDivision).details.name,


          }).save()
            .then((result) => {

            }).catch((err) => {
              console.log(err);
            });
          console.log('sending message...');
          MessagingService.send('push', recipients, {
            title: 'Reconciliation status is "Incomplete"',
            body: `Kindly submit the bills associated with ${(iro.FR as unknown as IFR).FRno} raised on ${moment((iro.FR as unknown as IFR).FRdate).format('DD-MMM-YYYY')} `,
            referenceURL: `${process.env.URL}/iro/${iro._id}`,
          })
            .catch((error) => {
              console.log(error);
            });
        });
      }
    });
}

export const incompleteIRONotification = () => {
  cron.schedule('0 10 * * * ', incompleteIROFor90);
  cron.schedule('0 10 * * * ', incompleteIROFor60);
  cron.schedule('0 10 * * * ', incompleteIROFor30);
};


