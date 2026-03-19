import {Router} from 'express';
import jwt from 'jsonwebtoken';
import {sendStandardResponse} from './helpers';
import User from '../modules/users/models/User';
import {IUserPermissions} from '../modules/users/models/UserPermissions';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const authCheck = (permissions: (keyof Omit<IUserPermissions, '_id'>)[]) => {
  const router = Router();
  router.use(async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return sendStandardResponse(res, 'UNAUTHORIZED', {
        error: 'Unauthorized',
        message: 'Please login to continue',
      });
    }

    const token = authHeader?.split(' ')[1];

    if (!token) {
      return sendStandardResponse(res, 'UNAUTHORIZED', {
        error: 'Unauthorized',
        message: 'Please login to continue',
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
        _id: string;
      };
      const loggedInUser = await User.findById(decoded._id)
        .select('-password')
        .populate('permissions');

      if (!loggedInUser) {
        return sendStandardResponse(res, 'UNAUTHORIZED', {
          error: 'Unauthorized',
          message: 'Please login to continue',
        });
      }
      res.locals.authUser = loggedInUser;
      // console.log('🚀 ~ file: auth_check.ts:44 ~ router.use ~ loggedInUser:', loggedInUser);
      const deniedPermissions = [];
      if (permissions.length>0) {
        if (loggedInUser.permissions) {
          for (let i = 0; i < permissions.length; i++) {
            const permission = permissions[i];
            if (
              !loggedInUser.permissions[permission as keyof IUserPermissions]
            ) {
              deniedPermissions.push(permission);
            }
          }
        }
      }
      if (deniedPermissions.length > 0) console.log({deniedPermissions});

      if (deniedPermissions.length > 0) {
        return sendStandardResponse(res, 'UNAUTHORIZED', {
          error: 'Missing permissions',
          message: 'You do no have the permissions: ' + deniedPermissions.toString(),
        });
      }
      next();
    } catch (error) {
      console.log({error});
      return sendStandardResponse(res, 'UNAUTHORIZED', {
        error: 'Authorization failed',
        message: 'Something went wrong, and we were unable to authorize you',
      });
    }
  });
  return router;
};

export default authCheck;
