import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    // We try to initialize with the default credentials
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  } catch (error) {
    console.warn('Firebase Admin is not fully configured, falling back to basic init.', error);
    admin.initializeApp();
  }
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
export { admin };
