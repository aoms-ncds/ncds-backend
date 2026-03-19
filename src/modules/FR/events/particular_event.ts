
import MyEmitter from '../../../extras/MyEmmitter';
import {IParticulars} from '../models/particulars';


const particularEvents = new MyEmitter<{
    create: IParticulars,
    update: {
        previousParticulars: IParticulars;
        newParticulars: IParticulars
    },
    activate: IParticulars,
    deactivate: IParticulars,
    delete: IParticulars;
}>();

// eslint-disable-next-line @typescript-eslint/no-unused-vars
particularEvents.on('create', (particular) => {
  console.log('created Particulars');
});
particularEvents.on('update', ({data: {previousParticulars, newParticulars}}) => {
  console.log('update fr', previousParticulars, newParticulars);
});
particularEvents.on('activate', (data) => {
  console.log('Activated FR', data);
});
particularEvents.on('deactivate', (data) => {
  console.log('Deactivated FR', data);
});
particularEvents.on('delete', (fr) => {
  console.log('Delete FR', fr);
});
export default particularEvents;
