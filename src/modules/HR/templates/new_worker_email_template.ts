import {IWorker} from '../../workers/models/Worker';

/* eslint-disable max-len */
const newWorkerEmailTemplate = (worker: IWorker, password: string) => ({
  subject: 'Welcome to Navjeevan Community Development Society - Account Details',
  body: `Dear ${worker.basicDetails.firstName} ${worker.basicDetails?.middleName ?? ''} ${worker.basicDetails.lastName}, <br />
<br />
Thank you for signing up with Navjeevan Community Development Society! We are excited to have you as a member of our community. <br />
<br />
<b>Link:</b> ${process.env.URL}/ <br />
<br />
 If you have any questions or need assistance, feel free to reach out to our support team at aomssupport@ietmissions.org. <br />
<br />
At Navjeevan Community Development Society, we are dedicated to empowering individuals like you to make a positive impact through our mission. We believe that together, we can make a difference in the lives of many. <br />
<br />
Once again, welcome to Navjeevan Community Development Society! We look forward to seeing you thrive in our community. <br />
<br />
Best regards, <br />
The Navjeevan Community Development Society`,
});
export default newWorkerEmailTemplate;
