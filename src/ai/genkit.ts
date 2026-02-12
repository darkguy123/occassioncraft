import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';
import * as admin from 'firebase-admin';
import { firebaseConfig } from '@/firebase/config';

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    storageBucket: firebaseConfig.storageBucket,
  });
}

export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-2.5-flash',
});
