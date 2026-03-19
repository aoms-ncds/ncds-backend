import {IStaff} from '../models/Staff';

/* eslint-disable max-len */
const staffEmailChangeNotificationTemplate = (staff: IStaff, previousEmail: string, newEmail: string) => ({
  subject: 'Email Address Change Notification',
  body: `Dear ${staff.basicDetails.firstName} ${staff.basicDetails?.middleName?? ''} ${staff.basicDetails.lastName},<br/>
  <br/>
  We hope this email finds you well. We are writing to inform you that the email address associated with your account at Indian Evangelical Team has been successfully updated.<br/>
  <br/>
  Previous Email: ${previousEmail}<br/>
  New Email: ${newEmail}<br/>
  <br/>
  If you initiated this change, no further action is required from you. However, if you did not request this change or believe it to be an error, please contact our support team immediately at aomssupport@ietmissions.org.<br/>
  <br/>
  Ensuring the security of your account is our utmost priority, and we encourage you to take additional measures to protect your personal information. Here are a few tips:<br/>
  <br/>
  1. Use a strong, unique password for your Indian Evangelical Team account.<br/>
  2. Regularly update your password and avoid using the same password for multiple accounts.<br/>
  3. Be cautious of phishing attempts and avoid clicking on suspicious links or providing personal information to unknown sources.<br/>
  <br/>
  If you have any concerns or need further assistance, please don't hesitate to reach out to our support team. We're here to help!<br/>
  <br/>
  Thank you for being a valued member of Indian Evangelical Team.<br/>
  <br/>
  Best regards,<br/>
  The Indian Evangelical Team`,
});
export default staffEmailChangeNotificationTemplate;
