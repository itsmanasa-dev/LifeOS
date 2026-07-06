import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDlq5axei_TvTAoZrmDd7VxmB3GDfGYbrE",
  authDomain: "lifeos-80f46.firebaseapp.com",
  projectId: "lifeos-80f46",
  storageBucket: "lifeos-80f46.firebasestorage.app",
  messagingSenderId: "634862114444",
  appId: "1:634862114444:web:7087ea9efb4aa7ffe40da9",
  measurementId: "G-EPNM2216KG"
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
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});
const storage = getStorage(app);

// Provider Configs
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export { app, auth, db, storage, googleProvider, isConfigured };
