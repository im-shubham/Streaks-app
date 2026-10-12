import { createStore, StoreApi } from 'zustand/vanilla';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { dayKey } from '@/lib/streak';
import { Habit, canAddHabit, cleanName, isDayKey, mergeHabits, sanitizeHabits } from '@/lib/habits';

export type AddResult = 'ok' | 'empty' | 'limit';

export interface State {
  habits: Habit[];
  activeId: string | null;
  /** Habit ids deleted locally; kept so a stale cloud copy can't resurrect them. */
  deleted: string[];
  /** Firebase uid this data belongs to; null = guest data (can be adopted by the first account). */
  ownerUid: string | null;
  /** True once local storage has been read (or failed to read). */
  hydrated: boolean;
  /**
   * Entitlement. Deliberately NOT persisted and never read from browser storage: it can only
   * be set from a server-owned Firestore doc (or the dev-only toggle in non-production builds).
   */
  isPro: boolean;
  addHabit: (name: string) => AddResult;
  renameHabit: (id: string, name: string) => boolean;
  deleteHabit: (id: string) => void;
  setActive: (id: string) => void;
  /** Logs `today` once. false => unknown habit, invalid/future day, or already logged. */
  logToday: (id: string, today?: string) => boolean;
  mergeRemote: (remote: Habit[]) => void;
  setPro: (v: boolean) => void;
  /** Called on sign-in / sign-out. Adopts guest data; wipes data owned by a different user. */
  bindOwner: (uid: string | null) => void;
  resetLocal: () => void;
}

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export type HabitStore = StoreApi<State> & { persist: { rehydrate: () => Promise<void> | void } };

export function createHabitStore(storage: StateStorage): HabitStore {
  const store: HabitStore = createStore<State>()(
    persist(
      (set, get) => ({
        habits: [],
        activeId: null,
        deleted: [],
        ownerUid: null,
        hydrated: false,
        isPro: false,
        addHabit: (name) => {
          const n = cleanName(name);
          if (!n) return 'empty';
          const { habits, isPro } = get();
          if (!canAddHabit(habits.length, isPro)) return 'limit';
          const h: Habit = { id: newId(), name: n, createdAt: dayKey(), logs: [] };
          set({ habits: [...habits, h], activeId: h.id });
          return 'ok';
        },
        renameHabit: (id, name) => {
          const n = cleanName(name);
          if (!n || !get().habits.some((h) => h.id === id)) return false;
          set({ habits: get().habits.map((h) => (h.id === id ? { ...h, name: n } : h)) });
          return true;
        },
        deleteHabit: (id) => {
          const { habits, activeId, deleted } = get();
          if (!habits.some((h) => h.id === id)) return;
          const rest = habits.filter((h) => h.id !== id);
          set({
            habits: rest,
            deleted: [...new Set([...deleted, id])],
            activeId: activeId === id ? rest[0]?.id ?? null : activeId,
          });
        },
        setActive: (id) => {
          if (get().habits.some((h) => h.id === id)) set({ activeId: id });
        },
        logToday: (id, today = dayKey()) => {
          // `today` must be a real day and may never be in the future of the device's local day.
          if (!isDayKey(today) || today > dayKey()) return false;
          const h = get().habits.find((x) => x.id === id);
          if (!h || h.logs.includes(today)) return false;
          set({ habits: get().habits.map((x) => (x.id === id ? { ...x, logs: [...x.logs, today].sort() } : x)) });
          return true;
        },
        mergeRemote: (remote) => {
          const { habits, changed } = mergeHabits(get().habits, remote, get().deleted);
          if (!changed) return;
          set({ habits, activeId: get().activeId ?? habits[0]?.id ?? null });
        },
        setPro: (isPro) => set({ isPro }),
        bindOwner: (uid) => {
          const { ownerUid } = get();
          if (uid === ownerUid) return;
          if (uid && ownerUid === null) return set({ ownerUid: uid }); // adopt guest data
          // Different account (or sign-out of an account): never leak/merge one user's data into another.
          set({ habits: [], activeId: null, deleted: [], ownerUid: uid, isPro: false });
        },
        resetLocal: () => set({ habits: [], activeId: null, deleted: [], ownerUid: null, isPro: false }),
      }),
      {
        name: 'streaks-web-v1',
        version: 1,
        storage: createJSONStorage(() => storage),
        partialize: (s) => ({ habits: s.habits, activeId: s.activeId, deleted: s.deleted, ownerUid: s.ownerUid }),
        merge: (persisted, current) => {
          const p = (persisted ?? {}) as Partial<State>;
          const habits = sanitizeHabits(p.habits);
          const activeId = habits.some((h) => h.id === p.activeId) ? (p.activeId as string) : habits[0]?.id ?? null;
          const deleted = Array.isArray(p.deleted) ? p.deleted.filter((x): x is string => typeof x === 'string') : [];
          return { ...current, habits, activeId, deleted, ownerUid: typeof p.ownerUid === 'string' ? p.ownerUid : null };
        },
        // Also runs when reading fails, so a storage error can't leave the UI loading forever.
        onRehydrateStorage: () => () => {
          queueMicrotask(() => store.setState({ hydrated: true }));
        },
      },
    ),
  );
  return store;
}
