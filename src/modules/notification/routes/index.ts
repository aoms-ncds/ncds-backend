import {Router} from 'express';
import Message from '../../../models/Messages';
import authCheck from '../../../extras/auth_check';
import MessagingService from '../../../extras/Messaging';
import {sendStandardResponse} from '../../../extras/helpers';
import mongoose from 'mongoose';

const notificationRouter = Router();

notificationRouter.post('/send', authCheck(['READ_ACCESS']), async (req, res) => {
  console.log(req.body.type,
    req.body.recipients,
    {
      title: req.body.title,
      body: req.body.body,
      referenceURL: req.body.ref_url,
    });

  new Message({
    _id: new mongoose.Types.ObjectId(),
    title: req.body.title,
    body: req.body.body,
    ref_url: req.body.ref_url,
    recipients: req.body.recipients.map((recipient: string) => {
      return {
        user: recipient,
        read: false,

      };
    }),
    type: req.body.type,

  }).save();

  MessagingService.send(
    req.body.type,
    req.body.recipients,
    {
      title: req.body.title,
      body: req.body.body,
      referenceURL: req.body.ref_url,
      imageURL: req.body.img_url,
      primaryActionBtn: req.body.primary_action_btn,
      primaryURL: req.body.primary_url,
      secondaryActionBtn: req.body.secondary_action_btn,
      secondaryURL: req.body.secondary_url,
    })


    .then((email) =>
      sendStandardResponse(res, 'OK', {
        data: email,
        message: 'Successfully send',

      }),
    )
    .catch((err) => {
      console.log(err);

      sendStandardResponse(res, 'INTERNAL SERVER ERROR', {
        error: 'Unexpected server error',
        message: 'Something went wrong! Please try again',
      });
    });


  // res.status(200).json({ msg: "Hey there!" })
},


);

notificationRouter.get('/', authCheck(['READ_ACCESS']), async (req, res) => {
  if (
    !(
      typeof req.query.startDate === 'string' &&
            typeof req.query.endDate === 'string'

    )
  ) {
    return sendStandardResponse(res, 'INTERNAL SERVER ERROR', {
      error: 'Start Date or End Date not found error',
      message: 'Something went wrong! Please try again',
    });
  }
  console.log({
    date: {
      $gte: new Date(req.query.startDate),
      $lte: new Date(req.query.endDate),


    },
  });

  Message.find({
    createdAt: {
      $gte: new Date(req.query.startDate),
      $lte: new Date(req.query.endDate),
    },
  }).populate('recipients.user')
    .sort({createdAt: 'desc'})
    .then((message) =>
      sendStandardResponse(res, 'OK', {
        data: message,
        message: 'Fetched list of Messages',
      }),
    )
    .catch((err) => {
      console.log(err);

      sendStandardResponse(res, 'INTERNAL SERVER ERROR', {
        error: 'Unexpected server error',
        message: 'Something went wrong!',
      });
    });
});

notificationRouter.get('/my_messages', authCheck(['READ_ACCESS']), async (req, res) => {
  try {
    let data;
    console.log(req.query.title, 'req.query.title');

    if (req.query.title === 'true') {
      data = await Message.find({
        title: 'New bill uploaded for IRO',
        recipients: {
          $elemMatch: {
            user: res.locals.authUser._id,
            read: req.query.read,
          },
        },
      }).sort({createdAt: 'desc'});
    } else {
      data = await Message.find({
        recipients: {
          $elemMatch: {
            user: res.locals.authUser._id,
            read: req.query.read,
          },
        },
      }).sort({createdAt: 'desc'});
    }

    sendStandardResponse(res, 'OK', {
      data: data,
    });
  } catch (error) {
    sendStandardResponse(res, 'INTERNAL SERVER ERROR', {
      error,
      message: 'Something went wrong!',
    });
  }
});
notificationRouter.get('/my_messages/count', authCheck(['READ_ACCESS']), async (req, res) => {
  try {
    sendStandardResponse(res, 'OK', {
      data: await Message.countDocuments({
        'recipients': {
          $elemMatch: {
            user: res.locals.authUser._id,
            read: false,
          },
        },
      }),
    });
  } catch (error) {
    sendStandardResponse(res, 'INTERNAL SERVER ERROR', {
      error,
      message: 'Something went wrong!',
    });
  }
});
notificationRouter.get('/my_messages/countForBill', authCheck(['READ_ACCESS']), async (req, res) => {
  try {
    sendStandardResponse(res, 'OK', {
      data: await Message.countDocuments({
        'title': 'New bill uploaded for IRO',
        'read': false,
        // 'recipients': {
        //   $elemMatch: {
        //     // user: res.locals.authUser._id,
        //     read: false,
        //   },
        // },
      }),
    });
  } catch (error) {
    sendStandardResponse(res, 'INTERNAL SERVER ERROR', {
      error,
      message: 'Something went wrong!',
    });
  }
});

notificationRouter.patch('/mark_all_as_read', authCheck(['READ_ACCESS']), async (req, res) => {
  try {
    sendStandardResponse(res, 'OK',
      {
        data: await Message.updateMany(
          {

            'recipients': {
              $elemMatch: {
                user: res.locals.authUser._id,
                read: false,
              },
            },
          }, // filter by message ID and recipient ID
          {$set: {'recipients.$.read': true}}, // update the read property of the matching recipient
        ),
        message: 'Mark as Read',
      });
  } catch (error) {
    console.log(error);
    return sendStandardResponse(res, 'INTERNAL SERVER ERROR', {
      data: null,
      success: false,
      error: error,
      message:
                'Something went wrong Updating My Messages! Please try again',
    });
  }
});
notificationRouter.patch('/mark_all_as_read_for_bill', authCheck(['READ_ACCESS']), async (req, res) => {
  try {
    sendStandardResponse(res, 'OK',
      {
        data: await Message.updateMany(
          {
            'title': 'New bill uploaded for IRO',
            'read': false,
          },
          {
            $set: {read: true}, // Update the first matched recipient
          },
        ),

        message: 'Mark as Read',
      });
  } catch (error) {
    console.log(error);
    return sendStandardResponse(res, 'INTERNAL SERVER ERROR', {
      data: null,
      success: false,
      error: error,
      message:
                'Something went wrong Updating My Messages! Please try again',
    });
  }
});

notificationRouter.get('/:_id', authCheck(['READ_ACCESS']), async (req, res) => {
  try {
    sendStandardResponse(res, 'OK', {
      data: await Message.findOne({
        _id: req.params._id,
      }),

    });
  } catch (error) {
    sendStandardResponse(res, 'INTERNAL SERVER ERROR', {
      error,
      message: 'Something went wrong!',
    });
  }
});


notificationRouter.patch('/:_id/mark_as_read', authCheck(['READ_ACCESS']), async (req, res) => {
  try {
    sendStandardResponse(res, 'OK',
      {
        data: await Message.findOneAndUpdate(
          {
            '_id': req.params._id,
            'recipients': {
              $elemMatch: {
                user: res.locals.authUser._id,
                read: false,
              },
            },
          }, // filter by message ID and recipient ID
          {$set: {'recipients.$.read': true}}, // update the read property of the matching recipient
          {new: true}, // return the updated document
        ),
        message: 'Mark as Read',
      });
  } catch (error) {
    console.log(error);
    return sendStandardResponse(res, 'INTERNAL SERVER ERROR', {
      data: null,
      success: false,
      error: error,
      message:
                'Something went wrong Updating My Messages! Please try again',
    });
  }
});


export default notificationRouter;
