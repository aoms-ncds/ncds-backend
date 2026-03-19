import {Router} from 'express';
import uploadRouter from './upload';


const testRouter = Router();

testRouter.use('/upload', uploadRouter);
export default testRouter;
