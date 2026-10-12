import { get, set, del } from 'idb-keyval';
import type { StateStorage } from 'zustand/middleware';

/** IndexedDB-backed storage; falls back to in-memory if IDB is unavailable (private mode etc.). */
const mem = new Map<string, string>();
export const idbStorage: StateStorage = {
  getItem: async (k) => {
    try {
      return ((await get(k)) as string | undefined) ?? null;
    } catch {
      return mem.get(k) ?? null;
    }
  },
  setItem: async (k, v) => {
    mem.set(k, v);
    try {
      await set(k, v);
    } catch {
      /* in-memory only */
    }
  },
  removeItem: async (k) => {
    mem.delete(k);
    try {
      await del(k);
    } catch {
      /* ignore */
    }
  },
};
