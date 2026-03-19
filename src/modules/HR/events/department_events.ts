
import MyEmitter from '../../../extras/MyEmmitter';
import {IDepartment} from '../models/Department';


const departmentEvents = new MyEmitter<{
    create: IDepartment,
    update: {
        previousDepartment: IDepartment;
        newDepartment: IDepartment
    },
    activate: IDepartment,
    deactivate: IDepartment,
    delete: IDepartment;
}>();

departmentEvents.on('create', (department) => {
  console.log('created department', department);
});
departmentEvents.on('update', ({data: {previousDepartment, newDepartment}}) => {
  console.log('update department', previousDepartment, newDepartment);
});
departmentEvents.on('activate', (data) => {
  console.log('Activated department', data);
});
departmentEvents.on('deactivate', (data) => {
  console.log('Deactivated department', data);
});
// departmentEvents.on('delete', (department) => {
//   console.log('Delete department', department);
// });
export default departmentEvents;
