import { Options } from 'nodemailer/lib/mailer';
import GoogleMail from './google/GoogleMail';

class Mailer {
  static defaultMailer: MailerServices;

  public static use(defaultMailer: MailerServices) {
    Mailer.defaultMailer = defaultMailer;
  }

  public static sendMail = (
    args: Options,
    mailer?: MailerServices,
  ) => {
    const selectedMailer = mailer ?? Mailer.defaultMailer;

    if (selectedMailer === 'Gmail') {
      return GoogleMail.sendMail(args);
    }

    return Promise.reject(
      new Error('AWS SES sendMail function is not implemented'),
    );
  };
}

type MailerServices = 'Gmail' | 'AWS_SES';

export default Mailer;
