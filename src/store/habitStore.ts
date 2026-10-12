import { create, StoreApi, UseBoundStore } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { dayKey } from '../lib/streak';
import { Habit, mergeHabits, sanitizeHabits } from '../lib/habits';
import { THEMES, ThemeName } from '../theme';

export type { Habit };
export const FREE_HABIT_LIMIT = 1;

export interface State {
  habits: Habit[];
  activeId: string | null;
  isPro: boolean;
  theme: ThemeName;
  /** True once local storage has been read (or failed to read). UI waits on this. */
  hydrated: boolean;
  addHabit: (name: string) => boolean; // false => empty name or blocked by free limit
  logToday: (id: string, today?: string) => boolean; // false => unknown habit or already logged
  setActive: (id: string) => void;
  setPro: (v: boolean) => void;
  setTheme: (t: ThemeName) => void;
  mergeRemoteHabits: (remote: Habit[]) => void;
}

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/** Store factory; storage is injected so persistence can be tested without React Native. */
export function createHabitStore(storage: StateStorage): UseBoundStore<StoreApi<State>> {
  const store: UseBoundStore<StoreApi<State>> = create<State>()(
    persist(
      (set, get) => ({
        habits: [],
        activeId: null,
        isPro: false,
        theme: 'volt',
        hydrated: false,
        addHabit: (name) => {
          const { habits, isPro } = get();
          const trimmed = name.trim().slice(0, 28);
          if (!trimmed) return false;
          if (!isPro && habits.length >= FREE_HABIT_LIMIT) return false;
          const h: Habit = { id: newId(), name: trimmed, createdAt: dayKey(), logs: [] };
          set({ habits: [...habits, h], activeId: h.id });
          return true;
        },
        logToday: (id, today = dayKey()) => {
          const h = get().habits.find((x) => x.id === id);
          if (!h || h.logs.includes(today)) return false;
          set({
            habits: get().habits.map((x) => (x.id === id ? { ...x, logs: [...x.logs, today].sort() } : x)),
          });
          return true;
        },
        setActive: (id) => {
          if (get().habits.some((h) => h.id === id)) set({ activeId: id });
        },
        setPro: (isPro) => set({ isPro }),
        setTheme: (theme) => {
          if (THEMES[theme]?.pro && !get().isPro) return; // Pro gating lives in the store, not just the UI
          set({ theme });
        },
        mergeRemoteHabits: (remote) => {
          const { habits, changed } = mergeHabits(get().habits, remote);
          if (!changed) return;
          set({ habits, activeId: get().activeId ?? habits[0]?.id ?? null });
        },
      }),
      {
        name: 'streaks-v1',
        version: 1,
        storage: createJSONStorage(() => storage),
        partialize: (s) => ({ habits: s.habits, activeId: s.activeId, isPro: s.isPro, theme: s.theme }),
        // Never trust what comes off disk: validate shape, dedupe logs, repair activeId/theme.
        merge: (persisted, current) => {
          const p = (persisted ?? {}) as Partial<State>;
          const habits = sanitizeHabits(p.habits);
          const activeId = habits.some((h) => h.id === p.activeId) ? (p.activeId as string) : habits[0]?.id ?? null;
          const isPro = p.isPro === true;
          const wanted = p.theme && THEMES[p.theme] ? p.theme : 'volt';
          return { ...current, habits, activeId, isPro, theme: THEMES[wanted].pro && !isPro ? 'volt' : wanted };
        },
        // Runs on success AND on read failure. zustand never flips hasHydrated on failure, so
        // without this a storage error would leave the app on its loading screen forever.
        onRehydrateStorage: () => () => {
          queueMicrotask(() => store.setState({ hydrated: true }));
        },
      },
    ),
  );
  return store;
}
