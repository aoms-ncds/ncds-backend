/* eslint-disable max-len */

import mongoose from 'mongoose';
import MessagingService from '../../../extras/Messaging';
import MyEmitter from '../../../extras/MyEmmitter';
import {IUser} from '../../users/extras/user_types';
import User from '../../users/models/User';
import Message from '../../../models/Messages';
import {IDivision} from '../../divisions/models/Division';
import {IRemark} from '../models/iroRemarks';
import IRO, {IROrder} from '../models/IRO';


const remarkEvents = new MyEmitter<{
    create: IRemark,
    update: {
        previousParticulars: IRemark;
        newParticulars: IRemark
    },
    activate: IRemark,
    deactivate: IRemark,
    delete: IRemark;
}>();

remarkEvents.on('create', async (remark) => {
  const iro= await IRO.findById( remark.data.IRO).populate('division');
  console.log(iro);
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
        $or: [
          {'permissions.OFFICE_MNGR_ACCESS': true},
          {'permissions.ACCOUNTS_MNGR_ACCESS': true},
        ],
      },
    },
  ])
    .exec();
  const userIds:string[] = usersWithAccess.map((user) => {
    console.log('access', user._id);
    return user._id;
  });
  const recipients:string[]=[...userIds, ((iro as unknown as IROrder ).division as unknown as IDivision).details.coordinator?.name?._id as unknown as string];

  const title= 'Remark Added for IRO';
  const div=(iro as unknown as IROrder ).division.details.name.trim();

  const body= `New remarks added for ${(iro as unknown as IROrder ).IROno} by ${(remark.initiator as IUser).basicDetails.firstName} ${(remark.initiator as IUser).basicDetails?.middleName ?? ''} ${(remark.initiator as IUser).basicDetails.lastName}.`;
  console.log(recipients, 'userIds');
  console.log(userIds, 'userIds2');

  new Message({
    _id: new mongoose.Types.ObjectId(),
    title: title,
    body: body,
    ref_url: `${process.env.URL}/iro/${(iro as unknown as IROrder )._id}/ `,
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
    referenceURL: `${process.env.URL}/iro/${(iro as unknown as IROrder )._id}/ `,
  })
    .catch((error) => {
      console.log(error);
    });
});

export default remarkEvents;
