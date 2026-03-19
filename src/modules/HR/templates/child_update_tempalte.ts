import { IChild } from "../../workers/models/Child";




/* eslint-disable max-len */
const childeupdateTemplate = (child: IChild) => ({
  subject: 'Regarding Child Support Assistance',
  body: `Dear ${child.firstName} ${child.lastName} , <br />
<br />
<br />
Your child support assistance has been discontinued since you have crossed the age limit.
<br />
<br />
If you have any questions or need assistance, feel free to reach out to our support team at aomssupport@ietmissions.org. <br />
At Indian Evangelical Team, we are dedicated to empowering individuals like you to make a positive impact through our mission. We believe that together, we can make a difference in the lives of many. <br />
<br />
<br />
Best regards, <br />
The Indian Evangelical Team`,
});
export default childeupdateTemplate;
