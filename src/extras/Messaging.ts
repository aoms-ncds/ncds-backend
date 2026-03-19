import mongoose from 'mongoose';
import User from '../modules/users/models/User';
import GoogleMail from './google/GoogleMail';
// import {Options} from 'nodemailer/lib/mailer';
// import {token} from 'morgan';
import messaging from './Firebase/messaging';

class MessagingService {
  public static send = async (service: MessagingServices, recipients: mongoose.Types.ObjectId[] | string[], payload: MessagingPayload) => {
    if (service === 'email') {
      const recipientUsers = await User.find({
        _id: {
          $in: recipients,
        },
      });

      GoogleMail.sendMail({
        to: recipientUsers.map((user) => user.basicDetails.email).filter((email) => email !== undefined) as string[],
        subject: payload.title,
        text: payload.body,
        from: payload.from,

      // eslint-disable-next-line @typescript-eslint/no-empty-function
      }).then((res) => {
      }).catch(console.log);
    } else if (service === 'push') {
      const recipientUsers = await User.find({
        _id: {
          $in: recipients,
        },
      });
      const tokens = recipientUsers
        .map((user) => user.tokens)
        .flat()
        .filter((t) => !!t);

      console.log(tokens, 'TOKENS^^');

      if (tokens.length > 0) {
        try {
          const message = {
            tokens: tokens,
            notification: {
              title: payload.title,
              body: payload.body,
            },
          };

          const response = await messaging.sendEachForMulticast(message);

          console.log('Success count:', response.successCount);
          console.log('Failure count:', response.failureCount);
          console.log('Success count:', response.successCount);
          console.log('Failure count:', response.failureCount);
          console.log('Responses:', response.responses);

          console.log('Successfully sent message:');
        } catch (error) {
          console.error('FCM Send Error:', error);
        }
        // eslint-disable-next-line @typescript-eslint/no-empty-function
      }
    // eslint-disable-next-line no-empty
    } else if (service === 'whatsapp') {

    }
  };
}

// const ms = new MessagingService();
// ms.send();


declare global {
    type MessagingServices = 'email' | 'whatsapp' | 'push';
    interface MessagingPayload {
        title: string;
        body: string;
        from?: string;
        referenceURL?: string;
        imageURL?: string;
        primaryActionBtn?: string;
        primaryURL?: string;
        secondaryActionBtn?: string;
        secondaryURL?: string;
    }
}


export default MessagingService;
