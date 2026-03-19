import DivisionUpdateLog from '../../divisions/models/DivisionUpdateLog';
import UserUpdateLog from '../models/userUpdateLog';

function compareArrays(prevArray: any[], newArray: any[], fullKey: string, id: string, authUserId: string,
  code:string,
  type:'user'|'division',

) {
  // Compare array lengths
  if (prevArray?.length !== newArray.length) {
    if (type==='user') {
      new UserUpdateLog({
        userCode: code, // Adjust if you have access to workerCode
        userId: id,
        field: fullKey,
        doneBy: authUserId,
      }).save();
    } else {
      new DivisionUpdateLog({
        divName: code,
        divId: id,
        field: fullKey,
        doneBy: authUserId,
      }).save();
    }
    return;
  }

  // Compare individual elements
  prevArray.forEach((item, index) => {
    compareAndLog(item, newArray[index], fullKey, id, authUserId, code, type);
  });
}

const checkedKeys:string[]=[];
export function compareAndLog(
  prevObj: any,
  newObj: any,
  parentKey: string,
  id: string,
  authUserId: string,
  code: string,
  type: 'user' | 'division',
  checkedKeys: Set<string> = new Set(),
) {
  for (const key in newObj) {
    if (Object.prototype.hasOwnProperty.call(newObj, key)) {
      console.log(key, 'key99');
      console.log(parentKey, 'parentKey');
      const fullKey = parentKey ? `${parentKey}.${key}` : key;
      console.log(fullKey, 'fullKey');
      if (
        checkedKeys.has(fullKey) ||
        fullKey === 'details.coordinator.name'|| fullKey==='subDivisions'||
        (type === 'division' && key === 'division') ||
        type === 'user'
      ) {
        return;
      }
      checkedKeys.add(fullKey); // Add to local checked keys

      if (typeof newObj[key] === 'object' && newObj[key] !== null) {
        if (Array.isArray(newObj[key])) {
          compareArrays(prevObj?.[key], newObj[key], fullKey, id, authUserId, code, type);
        } else {
          compareAndLog(prevObj?.[key], newObj[key], fullKey, id, authUserId, code, type, checkedKeys);
        }
      } else {
        if (prevObj?.[key] !== newObj[key]) {
          if (type === 'user') {
            new UserUpdateLog({
              userCode: code,
              userId: id,
              field: fullKey,
              doneBy: authUserId,
            }).save();
          } else {
            new DivisionUpdateLog({
              divName: code,
              divId: id,
              field: fullKey,
              doneBy: authUserId,
            }).save();
          }
        }
      }
    }
  }
}


export function logDivChange(
  id: string,
  authUserId: string,
  code:string,
  type:'div'|'subDiv',
) {
  new UserUpdateLog({
    userCode: code,
    userId: id,
    field: type==='div'? 'officialDetails.division':'officialDetails.subDivision',
    doneBy: authUserId,
  }).save();
}
