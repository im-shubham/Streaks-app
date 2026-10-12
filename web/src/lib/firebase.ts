import { getApp, getApps, initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { Firestore, getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

/** Public web config. These are identifiers, not secrets; access control is firestore.rules. */
const cfg = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseConfigured = Boolean(cfg.apiKey && cfg.projectId && cfg.appId && cfg.authDomain);

let app: FirebaseApp | undefined;
export function fbApp(): FirebaseApp {
  return (app ??= getApps().length ? getApp() : initializeApp(cfg));
}
export const fbAuth = (): Auth => getAuth(fbApp());

let db: Firestore | undefined;
/** Firestore with an IndexedDB cache, so queued writes survive reloads and flush when back online. */
export function fbDb(): Firestore {
  if (db) return db;
  try {
    db = initializeFirestore(fbApp(), { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
  } catch {
    db = getFirestore(fbApp()); // already initialised, or persistence unsupported
  }
  return db;
}
