'use client';
import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import {
  GoogleAuthProvider, User, createUserWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail,
  signInWithEmailAndPassword, signInWithPopup, signInWithRedirect, signOut as fbSignOut,
} from 'firebase/auth';
import { fbAuth, firebaseConfigured } from '@/lib/firebase';
import { startSync, SyncStatus } from '@/lib/sync';
import { watchEntitlement } from '@/lib/entitlement';
import { habitStore, useStore } from '@/store/useStore';

interface Ctx {
  user: User | null;
  authReady: boolean;
  configured: boolean;
  sync: SyncStatus;
  online: boolean;
  google: () => Promise<void>;
  email: (mode: 'in' | 'up', email: string, pw: string) => Promise<void>;
  reset: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}
const C = createContext<Ctx | null>(null);
export const useApp = () => {
  const v = useContext(C);
  if (!v) throw new Error('Providers missing');
  return v;
};

export function Providers({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(!firebaseConfigured);
  const [sync, setSync] = useState<SyncStatus>('idle');
  const [online, setOnline] = useState(true);
  const hydrated = useStore((s) => s.hydrated);

  useEffect(() => {
    const up = () => setOnline(navigator.onLine);
    up();
    window.addEventListener('online', up);
    window.addEventListener('offline', up);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', up);
    };
  }, []);

  useEffect(() => {
    if (!firebaseConfigured) return;
    return onAuthStateChanged(fbAuth(), (u) => {
      setUser(u);
      setAuthReady(true);
    });
  }, []);

  // Start sync only after local data is loaded AND ownership is resolved, so cloud data is never
  // merged into a different user's local copy.
  useEffect(() => {
    if (!hydrated || !authReady) return;
    if (!user) {
      setSync('idle');
      habitStore.getState().setPro(false);
      return;
    }
    habitStore.getState().bindOwner(user.uid);
    const stopSync = startSync(user.uid, setSync);
    const stopEnt = watchEntitlement(user.uid);
    return () => {
      stopSync();
      stopEnt();
    };
  }, [hydrated, authReady, user]);

  const value = useMemo<Ctx>(
    () => ({
      user, authReady, configured: firebaseConfigured, sync, online,
      google: async () => {
        const p = new GoogleAuthProvider();
        try {
          await signInWithPopup(fbAuth(), p);
        } catch (e) {
          const code = (e as { code?: string }).code;
          if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') await signInWithRedirect(fbAuth(), p);
          else if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') throw e;
        }
      },
      email: async (mode, em, pw) => {
        await (mode === 'up' ? createUserWithEmailAndPassword : signInWithEmailAndPassword)(fbAuth(), em, pw);
      },
      reset: (em) => sendPasswordResetEmail(fbAuth(), em),
      signOut: async () => {
        // Give queued writes a moment to flush, then clear this device so the next person never sees it.
        await new Promise((r) => setTimeout(r, 700));
        await fbSignOut(fbAuth());
        habitStore.getState().resetLocal();
      },
    }),
    [user, authReady, sync, online],
  );
  return <C.Provider value={value}>{children}</C.Provider>;
}
