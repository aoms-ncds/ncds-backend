import MyEmitter from '../../../extras/MyEmmitter';
import {IChildSupport} from '../models/childSupport';

const childSupportEvents = new MyEmitter<{
  create: IChildSupport;
  update: {
    previousChildSupport: IChildSupport;
    newChildSupport: IChildSupport;
  };
  activate: IChildSupport;
  deactivate: IChildSupport;
  delete: IChildSupport;
  forceDelete: IChildSupport;
}>();

childSupportEvents.on('create', (childSupport) => {
  console.log('Created childSupport', childSupport);
});

childSupportEvents.on('update', ({data: {previousChildSupport, newChildSupport}}) => {
  console.log('Updated childSupport', previousChildSupport, newChildSupport);
});

childSupportEvents.on('activate', (data) => {
  console.log('Activated childSupport', data);
});

childSupportEvents.on('deactivate', (data) => {
  console.log('Deactivated childSupport', data);
});

childSupportEvents.on('delete', (childSupport) => {
  console.log('Deleted childSupport', childSupport);
});

childSupportEvents.on('forceDelete', (childSupport) => {
  console.log('Force deleted childSupport', childSupport);
});

export default childSupportEvents;
