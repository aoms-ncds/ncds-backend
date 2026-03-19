import {Router} from 'express';
import staffsRouter from './staffs';
import designationsRouter from './designations';
import departmentsRouter from './departments';

const HRRouter = Router();

HRRouter.use('/staffs', staffsRouter);
HRRouter.use('/designations', designationsRouter);
HRRouter.use('/departments', departmentsRouter);


export default HRRouter;
