/* eslint-disable max-len */

import mongoose from 'mongoose';
import MessagingService from '../../../extras/Messaging';
import MyEmitter from '../../../extras/MyEmmitter';
import {IUser} from '../../users/extras/user_types';
import User from '../../users/models/User';
import {IFR} from '../models/FR';
import Message from '../../../models/Messages';
import Division, {IDivision} from '../../divisions/models/Division';
import Worker from '../../workers/models/Worker';
import {ObjectId} from 'mongodb';


const FREvents = new MyEmitter<{
    create: IFR,
    update: {
        previousFR: IFR;
        newFR: IFR
    },
    Approve:{
      updatedFR:IFR;
      status:string;
    }
    activate: IFR,
    deactivate: IFR,
    delete: IFR;
    signatureSheetAdded:IFR;
}>();

FREvents.on('create', (event) => {
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
        'permissions.MANAGE_FR': true,
      },
    },
  ])
    .exec()
    .then((usersWithWriteAccessToAccounts: IUser[]) => {
      // console.log(usersWithWriteAccesssToBudgetCode);
      const userIds = usersWithWriteAccessToAccounts.map((user) => {
        console.log(user._id);
        return user._id;
      });

      User.findById(event.initiator?._id).populate('division').then((curUser)=>{
        const curUserDiv=(curUser?.division as unknown as IDivision).details.name.trim();
        new Message({
          _id: new mongoose.Types.ObjectId(),
          title: 'New FR Requested',

          body:
          `${event.data.FRno} from ${(curUser as any).basicDetails.title ?? 'Pastor'} ${(curUser as IUser).basicDetails.firstName} ${(curUser as IUser).basicDetails.middleName ?? ''} ${(curUser as IUser).basicDetails.lastName},${curUserDiv} Division has raised a new Financial Request`,
          division: curUserDiv,
          ref_url: `${process.env.URL}/fr/${event.data._id}/view`,
          recipients: userIds.map((item) => ({user: item, read: false})),
          type: 'push',
        }).save()
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          .then(() => {

          }).catch((err) => {
            console.log(err);
          });
        console.log('sending message...');
        MessagingService.send('push', userIds, {
          title: 'New FR Requested',
          body: `${event.data.FRno} from ${(curUser as any).basicDetails.title ?? 'Pastor'}  ${(curUser as IUser).basicDetails.firstName} ${(curUser as IUser).basicDetails.middleName ?? ''} ${(curUser as IUser).basicDetails.lastName}, ${curUserDiv} Division has raised a new Financial Request`,
          referenceURL: `${process.env.URL}/fr/${event.data._id}/view`,
        })
          .catch((error) => {
            console.log(error);
          });
      });
    })
    .catch((error) => {
      console.log(error);
    });
  // console.log('created FR', event.data);
});
FREvents.on('update', ({data: {previousFR, newFR}}) => {
  console.log('update fr', previousFR._id, newFR._id);
});
FREvents.on('activate', (data) => {
  console.log('Activated FR', data);
});
FREvents.on('Approve', async (event) => {
  console.log(event?.data?.updatedFR.division?.details.coordinator?.name, 'HEY');
  const corId = event?.data?.updatedFR.division?.details.coordinator?.name;

  const usersWithAccess= await User.aggregate([
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
        $expr: {
          $cond: {
            if: {$eq: [event.data.status, 'Approve']},
            then: {$in: [true, '$permissions.OFFICE_MNGR_ACCESS']},
            else: {
              $cond: {
                if: {$eq: [event.data.status, 'sendToPresident']},
                then: {$in: [true, '$permissions.PRESIDENT_ACCESS']},
                else: {
                  $cond: {
                    if: {$eq: [event.data.status, 'sendToAccounts']},
                    then: {$in: [true, '$permissions.MANAGE_FR']},
                    else: false,
                  },
                },
              },
            },
          }},

        // $match: {
        //   // Add your extra condition here
        //   // For example, filtering based on a field named 'extraField'
        //   extraField: 'extraValue'
        // },
      },
    },
  ])
    .exec();
  const userIds= usersWithAccess.map((user) => {
    return user._id;
  });
  const newObjectIdArray: Array<ObjectId> = [new ObjectId(corId)];
  userIds.push(...newObjectIdArray);

  const recipients:string[]=[...userIds, event?.data.updatedFR.division.details.coordinator?.name?._id as unknown as string];
  const divisions = await Division.find({});
  const divOne = await Division.findById(event.data.updatedFR.division._id);
  const coordinatorNames = divisions.map((d) => d.details.coordinator?.name);
  const workers = await Worker.find({'_id': {$in: coordinatorNames}});
  console.log(workers.map((id)=>id._id), 'workers');


  const title= event.data.status === 'Approve' ?
    `FR ${event.data.updatedFR.FRno} from ${divOne?.details.name?? ''} verified and IRO on process.` :
    event.data.status === 'sendToPresident' ?
      'FR forwarded to President' :
      event.data.status === 'sendToAccounts' ?
        'FR forwarded to Accounts' :
        event.data.status === 'sendBack' ?
          'FR Reverted' :
          event.data.status === 'reject' ?
            'FR Rejected':'';
  const div=(event.data.updatedFR.division as unknown as IDivision).details.name.trim();
  console.log(title, 'title');

  const body= event.data.status === 'Approve' ?
    `FR ${event.data.updatedFR.FRno} Verification has been completed and IRO has been raised. Please wait for the IRO processing.` :
    event.data.status === 'sendToPresident' ?
      `${event.data.updatedFR.FRno} has been forwarded to president.` :
      event.data.status === 'sendToAccounts' ?
        `${event.data.updatedFR.FRno} has been forwarded to accounts.` :
        event.data.status === 'sendBack' ?
          `${event.data.updatedFR.FRno} has been revert. Please check `:
          event.data.status === 'reject' ?
            `${event.data.updatedFR.FRno} has been rejected. Please check and revert`:'';
  console.log(recipients);
  new Message({
    _id: new mongoose.Types.ObjectId(),
    title: title,
    body: body,
    ref_url: `${process.env.URL}/fr/${event.data.updatedFR._id}/view `,
    recipients: userIds.map((item) => ({user: item, read: false})),
    division: div,
    type: 'push',
  }).save()
    .catch((err) => {
      console.log(err);
    });
  console.log('sending message...');
  MessagingService.send('push', userIds, {
    title: title,
    body: body,
    referenceURL: `${process.env.URL}/fr/${event.data.updatedFR._id}/view `,
  })
    .catch((error) => {
      console.log(error);
    });
  console.log('Updated FR', event.data.updatedFR.FRno, event.data.status);
});


// console.log('created FR', event.data);

FREvents.on('deactivate', (data) => {
  console.log('Deactivated FR', data);
});
FREvents.on('delete', (fr) => {
  console.log('Delete FR', fr);
});
FREvents.on('signatureSheetAdded', (event) => {
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
        'permissions.MANAGE_FR': true,
      },
    },
  ])
    .exec()
    .then((usersWithWriteAccessToAccounts: IUser[]) => {
      // console.log(usersWithWriteAccesssToBudgetCode);
      const userIds = usersWithWriteAccessToAccounts.map((user) => {
        // console.log(user._id);
        return user._id;
      });

      const curDiv=event.data.division.details.name.trim();
      console.log(curDiv);
      new Message({
        _id: new mongoose.Types.ObjectId(),
        title: `Support and Signature files attached for FR No ${event.data.FRno}`,
        body:
          ` Support and Signature files have been attached for FR No ${event.data.FRno} from Division, ${curDiv} . Please check the FR to view the files.`,
        division: curDiv,
        ref_url: `${process.env.URL}/fr/${event.data._id}/view`,
        recipients: userIds.map((item) => ({user: item, read: false})),
        type: 'push',
      }).save()
      // eslint-disable-next-line @typescript-eslint/no-empty-function
        .then(() => {

        }).catch((err) => {
          console.log(err);
        });
      console.log('sending message...');
      MessagingService.send('push', userIds, {
        title: `Support and Signature files attached for FR No ${event.data.FRno}`,
        body:
          ` Support and Signature files have been attached for FR No ${event.data.FRno} from Division, ${curDiv} . Please check the FR to view the files.`,
        referenceURL: `${process.env.URL}/fr/${event.data._id}/view`,
      })
        .catch((error) => {
          console.log(error);
        });
    });
  // })
  // .catch((error) => {
  //   console.log(error);
  // });
  // console.log('created FR', event.data);
});
export default FREvents;
