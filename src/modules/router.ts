import {Router} from 'express';
import division from './divisions';
import HR from './HR';
import workers from './workers';
import FR from './FR';
import IRO from './IRO';
import applications from './applications';
import users from './users';
import settings from './settings';
import test from './test';
import fileUploader from './fileUploader';
import notification from './notification';
import localFileUploader from './localFileUploader';
import CR from './customReport';


const router = Router();

router.use('/users', users.router);
router.use('/hr', HR.router);
router.use('/divisions', division.router);
router.use('/workers', workers.router);
router.use('/fr', FR.router);
router.use('/iro', IRO.router);
router.use('/application', applications.router);
router.use('/settings', settings.router);
router.use('/test', test.router);
router.use('/file', fileUploader.router);
router.use('/local_file', localFileUploader.router);
router.use('/notification', notification.router);
router.use('/custom-report', CR.router);


export default router;
