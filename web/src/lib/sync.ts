import { collection, doc, onSnapshot, setDoc, writeBatch, getDocs, Unsubscribe } from 'firebase/firestore';
import { fbDb } from './firebase';
import { habitStore } from '@/store/useStore';
import { Habit, isDayKey, sanitizeHabit } from './habits';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error';

/**
 * Local-first sync. IndexedDB (zustand) is the source of truth for the UI; Firestore is the
 * replica and its own persistent cache queues writes while offline.
 *
 *  - Remote -> local: union-merge only (logs are never removed locally by the cloud).
 *  - Local  -> remote: habit meta via setDoc; each completed day is its own doc `logs/{day}`
 *    created once (rules forbid updates), so pushes can only ADD history and duplicates are
 *    impossible. We track what the server is known to hold to avoid redundant writes.
 *  - Deletions are tombstoned locally (`deleted`) and replayed until the cloud confirms.
 */
export function startSync(uid: string, onStatus: (s: SyncStatus) => void): () => void {
  const db = fbDb();
  const habitsCol = collection(db, 'users', uid, 'habits');
  const known = new Map<string, Set<string>>(); // habitId -> days known to exist remotely
  const remoteMeta = new Map<string, { name: string; createdAt: string }>();
  const logUnsubs = new Map<string, Unsubscribe>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const loaded = new Set<string>(); // habits whose remote logs have arrived at least once
  let ready = false; // first habits snapshot received
  let stopped = false;

  const status = (s: SyncStatus) => !stopped && onStatus(typeof navigator !== 'undefined' && !navigator.onLine && s !== 'error' ? 'offline' : s);

  const mergeIn = () => {
    const remote: Habit[] = [];
    for (const [id, m] of remoteMeta) {
      const h = sanitizeHabit({ id, ...m, logs: [...(known.get(id) ?? [])] });
      if (h) remote.push(h);
    }
    habitStore.getState().mergeRemote(remote);
  };

  const watchLogs = (id: string) => {
    if (logUnsubs.has(id)) return;
    logUnsubs.set(
      id,
      onSnapshot(
        collection(db, 'users', uid, 'habits', id, 'logs'),
        (snap) => {
          const set = known.get(id) ?? new Set<string>();
          snap.docs.forEach((d) => isDayKey(d.id) && set.add(d.id));
          known.set(id, set);
          loaded.add(id);
          mergeIn();
          schedule(); // the server now tells us what it has; push whatever it lacks
        },
        () => status('error'),
      ),
    );
  };

  const unsubHabits = onSnapshot(
    habitsCol,
    (snap) => {
      snap.docs.forEach((d) => {
        const v = d.data() as { name?: string; createdAt?: string };
        if (typeof v.name === 'string' && typeof v.createdAt === 'string') remoteMeta.set(d.id, { name: v.name, createdAt: v.createdAt });
        watchLogs(d.id);
      });
      ready = true;
      mergeIn();
      status(snap.metadata.hasPendingWrites ? 'syncing' : 'synced');
      schedule();
    },
    () => status('error'),
  );

  const push = async () => {
    if (stopped || !ready) return;
    const { habits, deleted } = habitStore.getState();
    status('syncing');
    try {
      const writes: Promise<unknown>[] = [];
      for (const h of habits) {
        const meta = remoteMeta.get(h.id);
        if (!meta || meta.name !== h.name) {
          writes.push(setDoc(doc(habitsCol, h.id), { name: h.name, createdAt: h.createdAt }));
          remoteMeta.set(h.id, { name: h.name, createdAt: h.createdAt });
        }
        // Don't create log docs until we know which already exist (rules forbid overwriting them).
        if (remoteMeta.has(h.id) && !loaded.has(h.id)) continue;
        const have = known.get(h.id) ?? new Set<string>();
        known.set(h.id, have);
        for (const day of h.logs) {
          if (have.has(day)) continue;
          have.add(day);
          writes.push(setDoc(doc(db, 'users', uid, 'habits', h.id, 'logs', day), { day }));
        }
      }
      for (const id of deleted) {
        if (!remoteMeta.has(id) && !logUnsubs.has(id)) continue;
        writes.push(deleteHabitRemote(id));
      }
      // Offline, these promises stay pending until the SDK flushes its queue; don't block UI on them.
      Promise.allSettled(writes).then((r) => status(r.some((x) => x.status === 'rejected') ? 'error' : 'synced'));
      if (!writes.length) status('synced');
    } catch {
      status('error');
    }
  };

  async function deleteHabitRemote(id: string) {
    logUnsubs.get(id)?.();
    logUnsubs.delete(id);
    remoteMeta.delete(id);
    known.delete(id);
    const logs = await getDocs(collection(db, 'users', uid, 'habits', id, 'logs'));
    const batch = writeBatch(db);
    logs.docs.forEach((d) => batch.delete(d.ref));
    batch.delete(doc(habitsCol, id));
    await batch.commit();
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(push, 600);
  }
  const unsubLocal = habitStore.subscribe((s, p) => {
    if (s.habits !== p.habits || s.deleted !== p.deleted) schedule();
  });
  const online = () => schedule();
  const offline = () => status('offline');
  window.addEventListener('online', online);
  window.addEventListener('offline', offline);
  schedule();

  return () => {
    stopped = true;
    clearTimeout(timer);
    unsubHabits();
    logUnsubs.forEach((u) => u());
    unsubLocal();
    window.removeEventListener('online', online);
    window.removeEventListener('offline', offline);
  };
}
