import MyEmitter from '../../../extras/MyEmmitter';
import {IUser} from '../extras/user_types';


/**
 * A global event handler for user events
 */
class UserEvents extends MyEmitter<{
  login: IUser;
  loginFailure: {
    username: string;
    password: string;
  };
  reject:IUser;
}> {}
const userEvents = new UserEvents();

userEvents.on('login', (user) => {
  console.log('User logged in: \n'.blue, user);
});
userEvents.on('login', (user) => {
  console.log('User logged in: \n'.blue, user);
});


export default userEvents;
