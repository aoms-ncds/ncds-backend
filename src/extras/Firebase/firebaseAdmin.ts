import * as admin from 'firebase-admin';
import serviceAccount from '../../../ncds-production-firebase-adminsdk-fbsvc-9eecd9c328.json';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    projectId: 'ncds-production',
  });
}

// We can directly export admin to access all services (auth, messaging, storage, etc.)
export default admin;
