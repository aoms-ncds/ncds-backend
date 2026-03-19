import MyEmitter from '../../../extras/MyEmmitter';
import {ISubDivision} from '../models/SubDivision';

const subDivisionEvents = new MyEmitter<{
  create: ISubDivision;
  update: {
    previousSubDivision: ISubDivision;
    newSubDivision: ISubDivision;
  };
  activate: ISubDivision;
  deactivate: ISubDivision;
  delete: ISubDivision;
  forceDelete: ISubDivision;
}>();

subDivisionEvents.on('create', (subDivision) => {
  console.log('Created Sub division', subDivision);
});

subDivisionEvents.on(
  'update',
  ({data: {previousSubDivision, newSubDivision}}) => {
    console.log('Updated Sub division', previousSubDivision, newSubDivision);
  },
);

// subDivisionEvents.on('update', ({data: {previousSubDivision, newSubDivision}}) => { // We can use multiple handlers for the same event!
//   console.log('Updated Sub division', previousSubDivision, newSubDivision);
// });

subDivisionEvents.on('activate', (data) => {
  console.log('Activated Sub division', data);
});

subDivisionEvents.on('deactivate', (data) => {
  console.log('Deactivated Sub division', data);
});

subDivisionEvents.on('delete', (subDivision) => {
  console.log('Deleted Sub division', subDivision);
});

subDivisionEvents.on('forceDelete', (subDivision) => {
  console.log('Force deleted Sub division', subDivision);
});

export default subDivisionEvents;
