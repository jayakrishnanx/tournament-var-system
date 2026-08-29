import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCL0-eN-qX8aDT51UQzm4ilpOac-zukGXg",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "tournament-mangement.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "tournament-mangement",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "tournament-mangement.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "792807095641",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:792807095641:web:6d56f1d19e032c7ebee048",
  measurementId: "G-3HCLS2LXXD"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

// Enable offline persistence when available in browser
if (typeof window !== 'undefined') {
  try {
    enableIndexedDbPersistence(db).catch((err) => {
      if (err.code === 'failed-precondition') {
        console.warn('Firebase persistence warning: multiple tabs open');
      } else if (err.code === 'unimplemented') {
        console.warn('Firebase persistence not supported by browser');
      }
    });
  } catch (e) {
    // Ignore in unsupported environments
  }
}

export { app, db, auth };
export default db;
