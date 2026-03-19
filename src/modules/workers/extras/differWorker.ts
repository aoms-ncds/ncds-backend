
const IGNORED_FIELDS = [
  'createdAt',
  'updatedAt',
  '__v',
];

function isIgnoredField(path: string) {
  return IGNORED_FIELDS.some(f => path.endsWith(f));
}

 function isSameDate(a: any, b: any) {
  return a instanceof Date &&
         b instanceof Date &&
         a.getTime() === b.getTime();
}

 function normalizeValue(val: any) {
  if (val instanceof Date) return val.getTime();
  if (val?.toString && typeof val !== 'object') return val.toString();
  return val;
}

export default function diffObjects(oldObj: any, newObj: any, path = ''): any[] {
  const changes: any[] = [];

  for (const key in newObj) {
    const currentPath = path ? `${path}.${key}` : key;

    if (isIgnoredField(currentPath)) continue;

    const oldVal = oldObj?.[key];
    const newVal = newObj?.[key];

    // Ignore populated objects metadata
    if (
      typeof newVal === 'object' &&
      newVal !== null &&
      newVal._id &&
      (newVal.createdAt || newVal.updatedAt)
    ) {
      continue;
    }

    // Dates
    if (isSameDate(oldVal, newVal)) continue;

    // Arrays (shallow compare by IDs)
    if (Array.isArray(newVal)) {
      const oldIds = (oldVal || []).map((v: any) => v?._id?.toString?.() ?? v);
      const newIds = newVal.map((v: any) => v?._id?.toString?.() ?? v);

      if (JSON.stringify(oldIds) !== JSON.stringify(newIds)) {
        changes.push({
          field: currentPath,
          oldValue: oldIds,
          newValue: newIds,
        });
      }
      continue;
    }

    // Objects (recursive)
    if (typeof newVal === 'object' && newVal !== null) {
      changes.push(...diffObjects(oldVal, newVal, currentPath));
      continue;
    }

    // Primitive values
    if (normalizeValue(oldVal) !== normalizeValue(newVal)) {
      changes.push({
        field: currentPath,
        oldValue: oldVal,
        newValue: newVal,
      });
    }
  }

  return changes;
}