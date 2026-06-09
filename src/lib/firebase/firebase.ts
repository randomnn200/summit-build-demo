import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Only initialize when a real API key is present, so the app doesn't crash
// before Firebase is configured (e.g. during local practice without secrets).
export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey);

const app: FirebaseApp | null = isFirebaseConfigured
  ? getApps().length
    ? getApp()
    : initializeApp(firebaseConfig)
  : null;

// Cast so consumers keep their existing types; guarded by isFirebaseConfigured.
const auth = (app ? getAuth(app) : null) as Auth;
const db = (app ? getFirestore(app) : null) as Firestore;
const storage = (app ? getStorage(app) : null) as FirebaseStorage;

export { app, auth, db, storage };
