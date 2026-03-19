import mongoose from 'mongoose';
import MessagingService from '../../../extras/Messaging';
import MyEmitter from '../../../extras/MyEmmitter';
import IRO, {IROrder} from '../models/IRO';
import Message from '../../../models/Messages';
import User from '../../users/models/User';
import {IUser} from '../../users/extras/user_types';
import {IDivision} from '../../divisions/models/Division';
import {ObjectId} from 'mongodb';
import IROLifeCycleStates from '../extras/IROLifeCycleStates';

const IROEvents = new MyEmitter<{
  create: IROrder,
  update: IROrder,
  approve: {
    newIRO: IROrder;
    status: string;
  }
  release: IROrder[],
  activate: IROrder,
  deactivate: IROrder,
  delete: IROrder;
  forceDelete: IROrder;
  reconciliation_complete: IROrder;
  billUpload: string;
}>();


IROEvents.on('create', (iro) => {
  console.log('Created iro', iro);
});

IROEvents.on('update', async (data) => {
  const officeMngr = await User.aggregate([
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
        'permissions.OFFICE_MNGR_ACCESS': true,
      },
    },
  ])
    .exec();

  const userIds: string[] = officeMngr.map((user) => {
    console.log(user, 'user');
    return user._id;
  });
  // const recipients:string[]=[...userIds, iro.division?.details?.coordinator?.name?._id as unknown as string];
  const div = (data.data.division as unknown as IDivision).details.name.trim();

  new Message({
    _id: new mongoose.Types.ObjectId(),
    title: 'IRO Edited',
    // eslint-disable-next-line max-len
    body: `${data.data.IROno} from ${(data.data.createdBy as IUser)?.basicDetails?.title ?? 'Pastor'} ${(data.data.createdBy as IUser)?.basicDetails?.firstName} ${(data.data.createdBy as IUser)?.basicDetails?.middleName ?? ''} ${(data.data.createdBy as IUser)?.basicDetails.lastName}, ${div} Division has been edited`,
    ref_url: `http://aoms.ietapps.org/iro/${data.data._id}`,
    recipients: userIds.map((item) => ({user: item, read: false})),
    division: div,
    type: 'push',
  }).save()
    .catch((err) => {
      console.log(err);
    });
  console.log('sending message...');
  MessagingService.send('push', userIds, {
    title: 'IRO Edited',
    // eslint-disable-next-line max-len
    body: `${data.data.IROno} from ${(data.data.createdBy as IUser)?.basicDetails?.title ?? 'Pastor'} ${(data.data.createdBy as IUser)?.basicDetails?.firstName} ${(data.data.createdBy as IUser)?.basicDetails?.middleName ?? ''} ${(data.data.createdBy as IUser)?.basicDetails?.lastName}, ${div} Division has been edited`,
    referenceURL: `http://aoms.ietapps.org/iro/${data.data._id}`,
  })
    .catch((error) => {
      console.log(error);
    });
});


IROEvents.on('approve', async (event) => {
  console.log(event.data.status, 'event.data.status');
  console.log(event.data.newIRO.sanctionedBank, 'event.data.newIRO.sanctionedBank');
  const corId = event?.data?.newIRO?.division?.details.coordinator?.name;

  const usersWithAccess = await User.aggregate([
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
            if: {$eq: [event.data.status, 'officeManagerApprove']},
            then: {$in: [true, '$permissions.ACCOUNTS_MNGR_ACCESS']},
            else: {
              $cond: {
                if: {$eq: [event.data.status, 'accountManagerApprove']},
                then: {
                  $cond: {
                    if: {
                      $eq: [event.data.newIRO.sanctionedBank, 'Division Bank FCRA'],
                    },
                    then: {
                      $in: [true, '$permissions.FCRA_ACCOUNTS_ACCESS'],
                    },
                    else: {
                      $cond: {
                        if: {
                          $eq: [event.data.newIRO.sanctionedBank, 'Division Bank Local'],
                        },
                        then: {
                          $in: [true, '$permissions.LOCAL_ACCOUNT_ACCESS'],
                        },
                        else: {
                          $cond: {
                            if: {
                              $eq: [event.data.newIRO.sanctionedBank, 'Beneficiary Bank'],
                            },
                            then: {
                              $in: [true, '$permissions.OTHER_ACCOUNTS_ACCESS'],
                            },
                            else: {
                              $cond: {
                                if: {
                                  $eq: [event.data.newIRO.sanctionedBank, 'Beneficiary Bank 1'],
                                },
                                then: {
                                  $in: [true, '$permissions.OTHER_ACCOUNTS_ACCESS_1'],
                                },
                                else: {
                                  $cond: {
                                    if: {
                                      $eq: [event.data.newIRO.sanctionedBank, 'Beneficiary Bank 2'],
                                    },
                                    then: {
                                      $in: [true, '$permissions.OTHER_ACCOUNTS_ACCESS_2'],
                                    },
                                    else: {
                                      $cond: {
                                        if: {
                                          $eq: [event.data.newIRO.sanctionedBank, 'Beneficiary Bank 3'],
                                        },
                                        then: {
                                          $in: [true, '$permissions.OTHER_ACCOUNTS_ACCESS_3'],
                                        },
                                        else: {
                                          $cond: {
                                            if: {
                                              $eq: [event.data.newIRO.sanctionedBank, 'Beneficiary Bank 4'],
                                            },
                                            then: {
                                              $in: [true, '$permissions.OTHER_ACCOUNTS_ACCESS_4'],
                                            },
                                            else: false,
                                          },
                                        },

                                      },
                                    },

                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                    },

                  },
                },
                else: false,
              },
            },
          },
        },
      },
    },
  ])
    .exec();
  // console.log(usersWithWriteAccesssToBudgetCode);
  const userIds = usersWithAccess.map((user) => {
    console.log(user, 'user');

    return user._id;
  });
  const newObjectIdArray: Array<ObjectId> = [new ObjectId(corId)];
  userIds.push(...newObjectIdArray);

  // console.log('coordinator', event?.data.newIRO.division?.details?.coordinator?.name?._id);
  [...userIds, event?.data.newIRO.division.details.coordinator?.name?._id as unknown as string];

  const div = (event.data.newIRO.division as unknown as IDivision).details.name.trim();
  const title = event.data.status === 'officeManagerApprove' ?
    `IRO ${event.data.newIRO.IROno} from ${div} Approved– Review next steps.` :
    event.data.status === 'accountManagerApprove' ?
      'IRO approved by Accounts Manager' :
      event.data.status === 'close' ?
        `IRO ${event.data.newIRO.IROno} from ${div} has been closed.` :
        event.data.status === 'rejected' ?
          `IRO ${event.data.newIRO.IROno} from ${div}has been disapproved` :
          event.data.status === 'revert' ?
            `IRO ${event.data.newIRO.IROno} from ${div} has been reverted.` : '';

  const body = event.data.status === 'officeManagerApprove' ?
    // eslint-disable-next-line max-len
    ` IRO ${event.data.newIRO.IROno} from ${div} has been approved. Please wait for next steps.` :
    event.data.status === 'accountManagerApprove' ?
      // eslint-disable-next-line max-len
      `${event.data.newIRO.IROno} from Pastor ${(event.data.newIRO.createdBy as IUser)?.basicDetails?.firstName} ${(event.data.newIRO.createdBy as IUser)?.basicDetails?.middleName ?? ''} ${(event.data.newIRO.createdBy as IUser)?.basicDetails?.lastName}, ${div} Division has been approved by Accounts Manager` :
      event.data.status === 'close' ?
        // eslint-disable-next-line max-len
        `IRO ${event.data.newIRO.IROno} from ${div} has been closed ${(event.data.newIRO.createdBy as IUser)?.basicDetails?.firstName} ${(event.data.newIRO.createdBy as IUser)?.basicDetails?.middleName ?? ''} ${(event.data.newIRO.createdBy as IUser)?.basicDetails?.lastName}` :
        event.data.status === 'rejected' ?
          // eslint-disable-next-line max-len
          `IRO ${event.data.newIRO.IROno} has been disapproved. Check the reason, we will revisit the IRO for consideration in the future.` :
          event.data.status === 'revert' ?
          // eslint-disable-next-line max-len
            `IRO ${event.data.newIRO.IROno} from ${div} Reverted for attachment.` : '';

  new Message({
    _id: new mongoose.Types.ObjectId(),
    title: title,
    body: body,
    ref_url: `http://aoms.ietapps.org/iro/${event.data.newIRO._id}`,
    recipients: userIds?.map((item) => ({user: item, read: false})),
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
    referenceURL: `http://aoms.ietapps.org/iro/${event.data.newIRO._id}`,
  })
    .catch((error) => {
      console.log(error);
    });
  console.log('Updated iro', event.data.newIRO.IROno, event.data.status);
});

// });

IROEvents.on('release', async (event) => {
  const accountMngr = await User.aggregate([
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
        'permissions.ACCOUNTS_MNGR_ACCESS': true,
      },
    },
  ])
    .exec();
  event.data.map((iro) => {
    const userIds = accountMngr.map((user) => {
      // console.log(user, 'Err21');
      return user._id;
    });
    console.log('coordinator', iro);
    const corId = iro.division.details.coordinator?.name;
    // console.log(iro, 'iro.status ');

    const newObjectIdArray: Array<ObjectId> = [new ObjectId(corId)];
    userIds.push(...newObjectIdArray);

    [...userIds, iro.division?.details?.coordinator?.name?._id as unknown as string];
    const div = (iro.division as unknown as IDivision).details.name.trim();

    new Message({
      _id: new mongoose.Types.ObjectId(),
      title: iro.status ==IROLifeCycleStates.WAITING_FOR_ACCOUNTS_STATE? ' Release IRO sent for approval' : `IRO ${iro.IROno} from ${div} -Amount verified and released`,
      // title: 'Amount Released',
      // eslint-disable-next-line max-len
      body: iro.status == IROLifeCycleStates.WAITING_FOR_ACCOUNTS_STATE? `${iro.IROno} has been sent to the accounts manager for approval of release `: `IRO ${iro.IROno} from ${div} The amount has been released. Please check the release amount details for further information.`,
      // eslint-disable-next-line max-len
      // body: `Amount Released for ${iro.IROno} from Pastor ${(iro.createdBy as IUser).basicDetails.firstName} ${(iro.createdBy as IUser).basicDetails?.middleName ?? ''} ${(iro.createdBy as IUser).basicDetails.lastName}, ${div} Division`,
      ref_url: `http://aoms.ietapps.org/iro/${iro._id}`,
      recipients: userIds.map((item) => ({user: item, read: false})),
      division: div,
      type: 'push',
    }).save()
      .catch((err) => {
        console.log(err);
      });
    console.log('sending message...');

    MessagingService.send('push', userIds, {
      title: iro.status ==IROLifeCycleStates.WAITING_FOR_ACCOUNTS_STATE? ' Release IRO sent for approval' :`IRO ${iro.IROno} from ${div} -Amount verified and released`,
      // title: 'Amount Released',
      // eslint-disable-next-line max-len
      body: iro.status ==IROLifeCycleStates.WAITING_FOR_ACCOUNTS_STATE? `${iro.IROno} has been sent to accounts manager for approval of release`: `IRO ${iro.IROno} from ${div} The amount has been released. Please check the release amount details for further information.`,
      // eslint-disable-next-line max-len
      // body: `Amount Released for ${iro.IROno} from Pastor ${(iro.createdBy as IUser).basicDetails.firstName} ${(iro.createdBy as IUser).basicDetails?.middleName ?? ''} ${(iro.createdBy as IUser).basicDetails.lastName}, ${div} Division`,
      referenceURL: `http://aoms.ietapps.org/iro/${iro._id}`,
    })
      .catch((error) => {
        console.log(error);
      });
  });
});

IROEvents.on('billUpload', async (event) => {
  const iro = await IRO.findById(event.data).populate('division').populate('createdBy');
  console.log(iro?.sourceOfAccount, 'bank111');
  const fullData = iro?.sanctionedBank;
  const bankName = fullData?.split('-')[0]?.trim();
  console.log(bankName, 'bankName');
  const usersWithAccess = await User.aggregate([
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
            if: {
              $eq: [iro?.sourceOfAccount, 'FCRA'],
            },
            then: {
              $in: [true, '$permissions.FCRA_ACCOUNTS_ACCESS'],
            },
            else: {
              $cond: {
                if: {
                  $eq: [iro?.sourceOfAccount, 'Local'],
                },
                then: {
                  $in: [true, '$permissions.LOCAL_ACCOUNT_ACCESS'],
                },
                else: false, // Default 'else' value
              },
            },
          },
        },
      },
    },
  ])
    .exec();
  const recipients = usersWithAccess.map((user) => {
    return user._id;
  });
  const corId = iro?.division.details.coordinator?.name;
  console.log(recipients, 'recipientsFirdt');
  const newObjectIdArray: Array<ObjectId> = [new ObjectId(corId)];
  recipients.push(...newObjectIdArray);
  console.log(recipients, 'userIdsFirdt33');

  const title = 'New bill uploaded for IRO';
  const div = (iro?.division as unknown as IDivision).details.name.trim();

  const body = // eslint-disable-next-line max-len
  `A new bill has been attached for IRO ${iro?.IROno} from ${div} division for reconciliation. Kindly check.`;

  new Message({
    _id: new mongoose.Types.ObjectId(),
    title: title,
    body: body,
    ref_url: `http://aoms.ietapps.org/iro/${iro?._id}`,
    recipients: recipients.map((item) => ({user: item, read: false})),
    division: div,
    read: false,
    type: 'push',
  }).save()
    .catch((err) => {
      console.log(err);
    });
  console.log('sending message...');
  MessagingService.send('push', recipients, {
    title: title,
    body: body,
    referenceURL: `http://aoms.ietapps.org/iro/${iro?._id}`,
  })
    .catch((error) => {
      console.log(error);
    });
  console.log('bills Uploaded', iro?.IROno);
});

IROEvents.on('activate', (data) => {
  console.log('Activated iro', data);
});

IROEvents.on('deactivate', (data) => {
  console.log('Deactivated iro', data);
});

IROEvents.on('delete', (iro) => {
  console.log('Deleted iro', iro);
});

IROEvents.on('forceDelete', (iro) => {
  console.log('Force deleted iro', iro);
});
IROEvents.on('reconciliation_complete', (event) => {
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
        'permissions.MANAGE_IRO': true,
      },
    },
  ])
    .exec()
    .then(async (usersWithWriteAccessToHR: IUser[]) => {
      // console.log(usersWithWriteAccesssToBudgetCode);
      const userIds = usersWithWriteAccessToHR.map((user) => {
        return user._id;
      });

      const corId = event.data.division.details.coordinator?.name;
      const newObjectIdArray: Array<ObjectId> = [new ObjectId(corId)];
      userIds.push(...newObjectIdArray);
      // console.log('divHead:', event?.data);

      const recipients: string[] = [...userIds, event?.data.division?.details.coordinator?.name?._id as unknown as string];

      console.log('sending Notification', recipients);
      // const userIds=[fr.createdBy._id];

      const curUserDiv = event?.data.division?.details.name.trim();
      new Message({
        _id: new mongoose.Types.ObjectId(),
        title: 'Reconciliation Completed',

        body:
          `All bills of ${event?.data.IROno} from ${curUserDiv} is completed. Thank you for your corporation`,
        division: curUserDiv,
        ref_url: `${process.env.URL}/iro/manage`,
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
        title: 'Reconciliation Completed',
        body:
          `All bills of ${event?.data.IROno} from ${curUserDiv} is completed. Thank you for your corporation`,
        referenceURL: `${process.env.URL}/iro/manage`,
      })
        .catch((error) => {
          console.log(error);
        });

      console.log('reconciliation_complete', event.data);
    });
});

export default IROEvents;
