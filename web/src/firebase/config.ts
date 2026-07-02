import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Check if credentials are set (avoid crashing if not configured yet)
const isConfigured = Object.values(firebaseConfig).every(val => !!val);

const dummyConfig = {
  apiKey: "AIzaSyDummyKeyForPreviewPurposeOnly12345",
  authDomain: "lifeos-mock.firebaseapp.com",
  projectId: "lifeos-mock",
  storageBucket: "lifeos-mock.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:123456789abc",
};

if (!isConfigured) {
  console.warn(
    'LifeOS Warning: Firebase configuration environment variables are missing. Please configure your .env file.'
  );
}

// Initialize Firebase with real config or dummy config to prevent module loading crash
const app = getApps().length === 0 
  ? initializeApp(isConfigured ? firebaseConfig : dummyConfig) 
  : getApp();

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Provider Configs
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export { app, auth, db, storage, googleProvider, isConfigured };
