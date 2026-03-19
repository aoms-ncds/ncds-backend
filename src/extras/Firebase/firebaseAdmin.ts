import * as admin from 'firebase-admin';
import serviceAccount from '../../../pro910-iet-firebase-adminsdk-fbsvc-617ec747ac.json';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    projectId: 'pro910-iet',
  });
}

// We can directly export admin to access all services (auth, messaging, storage, etc.)
export default admin;
