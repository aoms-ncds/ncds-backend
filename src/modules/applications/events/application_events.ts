/* eslint-disable max-len */
import MyEmitter from '../../../extras/MyEmmitter';
import {IUser} from '../../users/extras/user_types';
import User from '../../users/models/User';
import {IApplication} from '../models/Application';
import mongoose from 'mongoose';
import MessagingService from '../../../extras/Messaging';
import Message from '../../../models/Messages';
import {sendStandardResponse} from '../../../extras/helpers';
import {response} from 'express';
import {IDivision} from '../../divisions/models/Division';

const applicationsEvents = new MyEmitter<{
    create: IApplication,
    update: {
        previousApplication: IApplication;
        newApplication:IApplication
    },
    approve:IApplication,
    active:IApplication,
    activate: IApplication,
    deactivate: IApplication,
    delete: IApplication;

}>();
applicationsEvents.on('create', ({data}) => {
  // authCheck(['MANAGE_APPLICATION']),
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
        'permissions.MANAGE_APPLICATION': true,
      },
    },
    // 'permissions.PRESIDENT_ACCESS': true,

  ])
    .exec()
    .then(async (usersWithManageApplication: IUser[]) => {
      // console.log(usersWithWriteAccesssToBudgetCode);
      const userIds = usersWithManageApplication.map((user) => {
        return user._id;
      });

      User.findById(data.createdBy).populate('division').then((curUser)=>{
        const curUserDiv=(curUser?.division as unknown as IDivision).details.name.trim();
        new Message({
          _id: new mongoose.Types.ObjectId(),
          title: 'Application Created',
          body: `${data.applicationCode} from ${(curUser as IUser).basicDetails?.title ?? 'Pastor'} ${(curUser as IUser).basicDetails?.firstName ?? ''} ${(curUser as IUser).basicDetails.firstName} ${(curUser as IUser).basicDetails.lastName},${curUserDiv} 
          Division has created a new application Request`,
          division: curUserDiv,
          ref_url: `http://aoms.ietapps.org/application/${ data._id}/approval`,
          recipients: userIds.map((item) => ({user: item, read: false})),
          type: 'push',
        }).save()
          .then((result) => {
            sendStandardResponse( response, 'OK', {
              message: 'Message sent Successfully ',
            });
          }).catch((err) => {
            console.log(err);
          });
        console.log('sending message...');
        MessagingService.send('push', userIds, {
          title: 'Application Created',
          body: `${data.applicationCode} from ${(curUser as IUser).basicDetails?.title ?? 'Pastor'} ${(curUser as IUser).basicDetails.firstName} ${(curUser as IUser).basicDetails.middleName ?? ''} ${(curUser as IUser).basicDetails.lastName},${curUserDiv} 
          Division has created a new application Request`,

          referenceURL: `http://aoms.ietapps.org/application/${ data._id}/approval`,
        })
          .catch((error) => {
            console.log(error);
          });
      });
    })
    .catch((error) => {
      console.log(error);
    });
});
applicationsEvents.on('active', ({data}) => {
  // authCheck(['MANAGE_APPLICATION']),
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
        'permissions.PRESIDENT_ACCESS': true,
      },
    },
    // 'permissions.PRESIDENT_ACCESS': true,

  ])
    .exec()
    .then(async (usersWithManageApplication: IUser[]) => {
      // console.log(usersWithWriteAccesssToBudgetCode);
      const userIds = usersWithManageApplication.map((user) => {
        return user._id;
      });

      User.findById(data.createdBy).populate('division').then((curUser)=>{
        const recipients:string[]=[...userIds, data.createdBy];
        const curUserDiv=(curUser?.division as unknown as IDivision).details.name.trim();
        new Message({
          _id: new mongoose.Types.ObjectId(),
          title: 'Application forwarded',
          body: `${data.applicationCode} from ${(curUser as IUser).basicDetails?.title ?? 'Pastor'} ${(curUser as IUser).basicDetails.firstName} ${(curUser as IUser).basicDetails.middleName?? ''} ${(curUser as IUser).basicDetails.lastName},${curUserDiv} 
          Division has  forwarded to President  `,
          division: curUserDiv,
          ref_url: `http://aoms.ietapps.org/application/${data._id}/approval`,
          recipients: recipients.map((item) => ({user: item, read: false})),
          type: 'push',
        }).save()
          .then((result) => {
            sendStandardResponse( response, 'OK', {
              message: 'Message sent Successfully ',
            });
          }).catch((err) => {
            console.log(err);
          });
        console.log('sending message...');
        MessagingService.send('push', recipients, {
          title: 'Application forwarded',
          body: `${data.applicationCode} from ${(curUser as IUser).basicDetails?.title ?? 'Pastor'} ${(curUser as IUser).basicDetails.firstName} ${(curUser as IUser).basicDetails.middleName?? ''} ${(curUser as IUser).basicDetails.lastName},${curUserDiv} 
          Division has forwarded to President `,

          referenceURL: `http://aoms.ietapps.org/application/${data._id}/approval`,
        })
          .catch((error) => {
            console.log(error);
          });
      });
    })
    .catch((error) => {
      console.log(error);
    });
});
applicationsEvents.on('approve', ({data}) => {
  // authCheck(['MANAGE_APPLICATION']),
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
        'permissions.PRESIDENT_ACCESS': true,
      },
    },
    // 'permissions.PRESIDENT_ACCESS': true,

  ])
    .exec()
    .then(async (usersWithManageApplication: IUser[]) => {
      // console.log(usersWithWriteAccesssToBudgetCode);
      const userIds = usersWithManageApplication.map((user) => {
        return user._id;
      });


      User.findById(data.createdBy).populate('division').then((curUser)=>{
        const recipients:string[]=[...userIds, data.createdBy];
        const curUserDiv=(curUser?.division as unknown as IDivision).details.name.trim();
        new Message({
          _id: new mongoose.Types.ObjectId(),
          title: 'Application is Approved ',
          body: `${data.applicationCode} from ${(curUser as IUser).basicDetails?.title ?? 'Pastor'} ${(curUser as IUser).basicDetails.firstName} ${(curUser as IUser).basicDetails.middleName} ${(curUser as IUser).basicDetails.lastName},${curUserDiv} 
          Division has been Approved  `,
          division: curUserDiv,
          ref_url: `http://aoms.ietapps.org/application/${data._id}/approval`,
          recipients: recipients.map((item) => ({user: item, read: false})),
          type: 'push',
        }).save()
          .then((result) => {
            sendStandardResponse( response, 'OK', {
              message: 'Message sent Successfully ',
            });
          }).catch((err) => {
            console.log(err);
          });
        console.log('sending message...');
        MessagingService.send('push', recipients, {
          title: 'Application is Approved',
          body: `${data.applicationCode} from ${(curUser as IUser).basicDetails?.title ?? 'Pastor'} ${(curUser as IUser).basicDetails.firstName} ${(curUser as IUser).basicDetails.middleName} ${(curUser as IUser).basicDetails.lastName},${curUserDiv} 
          Division has been Approved `,

          referenceURL: `http://aoms.ietapps.org/application/${data._id}/approval`,
        })
          .catch((error) => {
            console.log(error);
          });
      });
    })
    .catch((error) => {
      console.log(error);
    });

  console.log('created Application', data);
});
applicationsEvents.on('update', ({data: {previousApplication, newApplication}}) => {
  console.log('update Application', previousApplication, newApplication);
});
applicationsEvents.on('activate', (data) => {
  console.log('Activated Application', data);
});
applicationsEvents.on('deactivate', (data) => {
  console.log('Deactivated Application', data);
});
applicationsEvents.on('delete', (applications) => {
  console.log('Delete Application', applications);
});
export default applicationsEvents;

