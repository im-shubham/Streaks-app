import { doc, onSnapshot } from 'firebase/firestore';
import { fbDb } from './firebase';
import { habitStore } from '@/store/useStore';

/**
 * Pro comes ONLY from `users/{uid}/private/entitlement`, which firestore.rules make read-only
 * for clients (written by trusted server code in the payments phase). Nothing in browser
 * storage can grant it. NOTE: the free-tier habit limit itself is enforced client-side until
 * the payments phase adds a server-side check; the entitlement doc is the authority for Pro.
 */
export function watchEntitlement(uid: string): () => void {
  return onSnapshot(
    doc(fbDb(), 'users', uid, 'private', 'entitlement'),
    (snap) => habitStore.getState().setPro(snap.exists() && snap.data()?.active === true),
    () => habitStore.getState().setPro(false),
  );
}

/** Dev-only entitlement testing: compiled out of production builds, never persisted. */
export const devProAllowed = process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_ENABLE_DEV_PRO === '1';
