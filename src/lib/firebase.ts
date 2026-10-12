import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import { arrayUnion, doc, getFirestore, onSnapshot, setDoc } from 'firebase/firestore';
import { sanitizeHabit, Habit } from './habits';
import { useStore } from '../store/useStore';

const cfg = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

function getAuthWithPersistence() {
  const app = getApps().length ? getApp() : initializeApp(cfg);
  try {
    // Without RN persistence every launch becomes a brand-new anonymous user and the
    // previous cloud copy is orphaned. The RN entry point exports this at runtime, but the
    // default type entry point doesn't declare it.
    const getReactNativePersistence = (FirebaseAuth as any).getReactNativePersistence;
    return FirebaseAuth.initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch {
    return FirebaseAuth.getAuth(app); // already initialised (fast refresh)
  }
}

/** Remote habits arrive as a map keyed by id; treat them as untrusted. */
const parseRemote = (data: unknown): Habit[] => {
  const map = (data as { habits?: Record<string, unknown> } | undefined)?.habits;
  if (!map || typeof map !== 'object') return [];
  return Object.entries(map)
    .map(([id, v]) => sanitizeHabit({ ...(v as object), id }))
    .filter((h): h is Habit => !!h);
};

/**
 * Local-first sync. The device store is the source of truth and is never overwritten by the
 * cloud: remote habits are union-merged in, and writes use per-habit map fields with
 * `arrayUnion`, so a push can only ADD log days server-side, never replace/erase history
 * (even from a device that has less of it). Writes made offline are queued by the SDK and
 * flushed on reconnect. Failures are retried with backoff and never touch local data.
 * Pro entitlement is deliberately NOT synced (it must come from verified purchases).
 * No-ops when Firebase isn't configured. Returns a stop function.
 */
export function startCloudSync(): () => void {
  if (!cfg.projectId) return () => {};
  let stopped = false;
  let cleanup = () => {};

  const connect = async (attempt: number): Promise<void> => {
    if (stopped) return;
    try {
      const auth = getAuthWithPersistence();
      const uid = auth.currentUser?.uid ?? (await FirebaseAuth.signInAnonymously(auth)).user.uid;
      if (stopped) return;
      const ref = doc(getFirestore(getApp()), 'users', uid);

      const unsubRemote = onSnapshot(
        ref,
        (snap) => useStore.getState().mergeRemoteHabits(parseRemote(snap.data())),
        () => {}, // permission/network error: keep running locally
      );

      let timer: ReturnType<typeof setTimeout> | undefined;
      const push = () => {
        const habits: Record<string, unknown> = {};
        for (const h of useStore.getState().habits) {
          habits[h.id] = {
            name: h.name,
            createdAt: h.createdAt,
            ...(h.logs.length ? { logs: arrayUnion(...h.logs) } : {}),
          };
        }
        if (Object.keys(habits).length) setDoc(ref, { habits }, { merge: true }).catch(() => {});
      };
      const schedule = () => {
        clearTimeout(timer);
        timer = setTimeout(push, 800);
      };
      const unsubLocal = useStore.subscribe((s, prev) => {
        if (s.habits !== prev.habits) schedule();
      });
      schedule(); // initial push of whatever is on the device

      cleanup = () => {
        clearTimeout(timer);
        unsubRemote();
        unsubLocal();
      };
    } catch {
      // Offline at launch, auth hiccup, etc. Retry; local use is unaffected meanwhile.
      setTimeout(() => connect(attempt + 1), Math.min(60_000, 1000 * 2 ** attempt));
    }
  };
  connect(0);

  return () => {
    stopped = true;
    cleanup();
  };
}
