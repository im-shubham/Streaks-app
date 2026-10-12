'use client';
import { useStore as useZ } from 'zustand';
import { createHabitStore, State } from './habitStore';
import { idbStorage } from './idbStorage';

const noopStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
/** One store per browser tab; on the server it is inert (never hydrated/persisted). */
export const habitStore = createHabitStore(typeof indexedDB === 'undefined' ? noopStorage : idbStorage);

export function useStore<T>(sel: (s: State) => T): T {
  return useZ(habitStore, sel);
}
