import { Iintiator } from "../models/intiator";
/* eslint-disable max-len */
const deleteLogEmailTemplate = (name: string, dateRange: string) => ({
  subject: "Log Deletion Notification - Indian Evangelical Team",
  body: `Dear ${name}, <br />
<br />
This is to notify you that a log has been deleted from the system. Below are the details of the deletion: <br />
<br />
<b>User:</b> ${name} <br />
<b>Date Range of Deleted Logs:</b> ${dateRange} <br />
<br />
Please ensure that this action was performed with proper authorization. If you believe this was done in error or have any questions, feel free to reach out to our support team at aomssupport@ietmissions.org. <br />
<br />
At Indian Evangelical Team, we take data integrity seriously, and we appreciate your cooperation in maintaining our system. <br />
<br />
Best regards, <br />
The Indian Evangelical Team`,
});
export default deleteLogEmailTemplate;
