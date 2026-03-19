import MyEmitter from '../../../extras/MyEmmitter';
import {IDesignation} from '../models/Designation';

const designationEvents = new MyEmitter<{
  create: IDesignation;
  update: {
    previousDesignation: IDesignation;
    newDesignation: IDesignation;
  };
  activate: IDesignation;
  deactivate: IDesignation;
  delete: IDesignation;
  forceDelete: IDesignation;
}>();

designationEvents.on('create', (designation) => {
  console.log('Created designation', designation);
});

designationEvents.on(
  'update',
  ({data: {previousDesignation, newDesignation}}) => {
    console.log('Updated designation', previousDesignation, newDesignation);
  },
);

designationEvents.on('update', (data) => {
  // We can use multiple handlers for the same event!
  // console.log('Updated designation', data.previousDesignation, data.newDesignation);
});

designationEvents.on('activate', (data) => {
  console.log('Activated designation', data);
});

designationEvents.on('deactivate', (data) => {
  console.log('Deactivated designation', data);
});

designationEvents.on('delete', (designation) => {
  console.log('Deleted designation', designation);
});

designationEvents.on('forceDelete', (designation) => {
  console.log('Force deleted designation', designation);
});

export default designationEvents;
