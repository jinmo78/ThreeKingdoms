import { type FirebaseApp, initializeApp } from 'firebase/app';
import { type Auth, getAuth } from 'firebase/auth';
import { type Firestore, getFirestore } from 'firebase/firestore';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const cloudConfigured = [config.apiKey, config.authDomain, config.projectId, config.appId].every(
  (v) => typeof v === 'string' && v.length > 0,
);

let app: FirebaseApp | null = null;

export function firebaseApp(): FirebaseApp {
  if (!cloudConfigured) throw new Error('Firebase 설정이 없습니다');
  if (!app) app = initializeApp(config);
  return app;
}

export function firebaseAuth(): Auth {
  return getAuth(firebaseApp());
}

export function firebaseDb(): Firestore {
  return getFirestore(firebaseApp());
}
