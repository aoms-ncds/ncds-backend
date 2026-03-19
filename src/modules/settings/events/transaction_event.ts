import commonEvents from '../../../events/common_events';
import Mailer from '../../../extras/Mailer';
import MyEmitter from '../../../extras/MyEmmitter';
import deleteLogEmailTemplate from '../templates/delete_log_email_template';

const transactionLogEvents = new MyEmitter<{
    delete: {
        dateRange:string,
    };
  }>();

transactionLogEvents.on('delete', async ({data: {dateRange}, initiator}) => {
  const user=`${initiator?.basicDetails.firstName} ${initiator?.basicDetails.middleName?? ''} ${initiator?.basicDetails.lastName}`;
  // Handle event
  console.log(
    `User ${user} Deleted log`
      .blue,
  );
  try {
    const deleteLogMail=deleteLogEmailTemplate(user, dateRange);
    await Mailer.sendMail({
      to: initiator?.basicDetails.email,
      from: `AOMS <${process.env.EMAIL}>`,
      //   bcc: previousStaff.basicDetails.email,
      subject: deleteLogMail.subject,
      html: deleteLogMail.body,
    });
  } catch (error) {
    console.log('Error sending delete log email to newly created user'.red, error);
    if (error instanceof Error) {
      commonEvents.emit('error', {data: error});
    } else {
      commonEvents.emit('unknownError', {data: error});
    }
  }
});
export default transactionLogEvents;
