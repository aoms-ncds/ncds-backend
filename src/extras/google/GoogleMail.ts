/* eslint-disable camelcase */
import {BaseExternalAccountClient, OAuth2Client} from 'google-auth-library';
import {gmail_v1, google} from 'googleapis';
import MailComposer from 'nodemailer/lib/mail-composer';
import {Options} from 'nodemailer/lib/mailer';

class GoogleMail {
  public static service: gmail_v1.Gmail | null;

  public static initialize(auth: BaseExternalAccountClient | OAuth2Client) {
    if (!GoogleMail.service) {
      GoogleMail.service = google.gmail({version: 'v1', auth});
    }
  }

  public static sendMail(options: Options) {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve, reject) => {
      const mailComposer = new MailComposer(options);
      const message = await mailComposer.compile().build();
      const raw = GoogleMail.encodeMessage(message);

      GoogleMail.service?.users.messages.send({
        userId: 'me',
        requestBody: {raw},
      }).then(resolve).catch(reject);
    });
  }

  private static encodeMessage = (message: any) => {
    return Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };
}

export default GoogleMail;
