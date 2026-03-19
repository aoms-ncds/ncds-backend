import MyEmitter from '../../../extras/MyEmmitter';
import {ILanguage} from '../models/language';

const languageEvents = new MyEmitter<{
  create: ILanguage;
  update: {
    previousLanguage: ILanguage;
    newLanguage: ILanguage;
  };
  activate: ILanguage;
  deactivate: ILanguage;
  delete: ILanguage;
  forceDelete: ILanguage;
}>();

languageEvents.on('create', (language) => {
  console.log('Created language', language);
});

languageEvents.on('update', ({data: {previousLanguage, newLanguage}}) => {
  console.log('Updated language', previousLanguage, newLanguage);
});

languageEvents.on('activate', (data) => {
  console.log('Activated language', data);
});

languageEvents.on('deactivate', (data) => {
  console.log('Deactivated language', data);
});

languageEvents.on('delete', (language) => {
  console.log('Deleted language', language);
});

languageEvents.on('forceDelete', (language) => {
  console.log('Force deleted language', language);
});

export default languageEvents;
