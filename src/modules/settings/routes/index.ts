import {Router} from 'express';
import languageRouter from './language';
import designationRouter from '../../HR/routes/designations';
import esignatureRouter from './esignature';
import departmentRouter from '../../HR/routes/departments';
import genderRouter from './gender';
import religionRouter from './religion';
import reasonRouter from './deactivationReason';
import sanctiondAsPerRouter from './sanctionedAsPer';
import partocularRouter from './particulars';
import paymentMethod from './paymentMethods';
import designationParticularsRouter from './designationParticulars';
import leaderDetails from './leaderDetails';
import transactionLogRouter from './transactionLogs';
import appliedForRouter from './appliedFor';
import applicationNamesRouter from './ApplicationNames';
import customUsersRouter from './customUsers';

const settingsRouter = Router();

settingsRouter.use('/language', languageRouter);
settingsRouter.use('/designation', designationRouter);
settingsRouter.use('/department', departmentRouter);
settingsRouter.use('/esignature', esignatureRouter);
settingsRouter.use('/gender', genderRouter);
settingsRouter.use('/religion', religionRouter);
settingsRouter.use('/deactivationReason', reasonRouter);
settingsRouter.use('/sanctionedAsPer', sanctiondAsPerRouter);
settingsRouter.use('/particulars', partocularRouter);
settingsRouter.use('/paymentMethod', paymentMethod);
settingsRouter.use('/designationParticulars', designationParticularsRouter);
settingsRouter.use('/leaderDetails', leaderDetails);
settingsRouter.use('/transactionLogs', transactionLogRouter);
settingsRouter.use('/applicationSettings', applicationNamesRouter);
settingsRouter.use('/appliedFor', appliedForRouter);
settingsRouter.use('/customUser', customUsersRouter);


export default settingsRouter;
