import {IWorker} from '../../workers/models/Worker';

/* eslint-disable max-len */
const newWorkerEmailTemplate = (worker: IWorker, password: string) => ({
  subject: 'Welcome to Indian Evangelical Team - Account Details',
  body: `Dear ${worker.basicDetails.firstName} ${worker.basicDetails?.middleName ?? ''} ${worker.basicDetails.lastName}, <br />
<br />
Thank you for signing up with Indian Evangelical Team! We are excited to have you as a member of our community. <br />
<br />
<b>Link:</b> ${process.env.URL}/ <br />
<br />
 If you have any questions or need assistance, feel free to reach out to our support team at aomssupport@ietmissions.org. <br />
<br />
At Indian Evangelical Team, we are dedicated to empowering individuals like you to make a positive impact through our mission. We believe that together, we can make a difference in the lives of many. <br />
<br />
Once again, welcome to Indian Evangelical Team! We look forward to seeing you thrive in our community. <br />
<br />
Best regards, <br />
The Indian Evangelical Team`,
});
export default newWorkerEmailTemplate;
