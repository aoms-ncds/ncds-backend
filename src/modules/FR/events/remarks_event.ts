
import mongoose from 'mongoose';
import MessagingService from '../../../extras/Messaging';
import MyEmitter from '../../../extras/MyEmmitter';
import {IUser} from '../../users/extras/user_types';
import User from '../../users/models/User';
import FR, {IFR} from '../models/FR';
import {IRemark} from '../models/remarks';
import Message from '../../../models/Messages';
import {IDivision} from '../../divisions/models/Division';


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
  const fr= await FR.findById( remark.data.FR).populate('division');
  console.log(fr);
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
        'permissions.MANAGE_FR': true,
      },
    },
  ])
    .exec();
  const userIds:string[] = usersWithAccess.map((user) => {
    console.log('access', user._id);
    return user._id;
  });
  const recipients:string[]=[...userIds, ((fr as unknown as IFR).division as unknown as IDivision).details.coordinator?.name?._id as unknown as string];

  const title= 'Remark Added for FR';
  const div=(fr as unknown as IFR).division.details.name.trim();

  const body= `New remarks added for ${(fr as unknown as IFR).FRno} by ${(remark.initiator as IUser).basicDetails?.firstName?? ''} ${(remark.initiator as IUser).basicDetails.middleName} ${(remark.initiator as IUser).basicDetails.lastName}.`;
  // console.log(recipients);

  new Message({
    _id: new mongoose.Types.ObjectId(),
    title: title,
    body: body,
    ref_url: `${process.env.URL}/fr/${(fr as unknown as IFR)._id}/view `,
    recipients: recipients.map((item) => ({user: item, read: false})),
    division: div,
    type: 'push',
  }).save()
    .catch((err) => {
      console.log(err);
    });
  console.log('sending message...');
  MessagingService.send('push', recipients, {
    title: title,
    body: body,
    referenceURL: `${process.env.URL}/fr/${(fr as unknown as IFR)._id}/view `,
  })
    .catch((error) => {
      console.log(error);
    });
});

export default remarkEvents;
