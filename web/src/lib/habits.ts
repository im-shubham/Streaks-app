import { dayKey } from './streak';

export interface Habit {
  id: string;
  name: string;
  createdAt: string;
  logs: string[]; // unique, ascending day keys
}

export const NAME_MAX = 28;
export const FREE_HABIT_LIMIT = 1;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** A real calendar day, e.g. rejects "2026-02-31". */
export function isDayKey(v: unknown): v is string {
  if (typeof v !== 'string' || !DAY_RE.test(v)) return false;
  const [y, m, d] = v.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d)) === v;
}

export const cleanName = (s: string) => s.trim().replace(/\s+/g, ' ').slice(0, NAME_MAX);

export function normalizeLogs(logs: unknown): string[] {
  if (!Array.isArray(logs)) return [];
  return [...new Set(logs.filter(isDayKey))].sort();
}

/** Validates untrusted data (disk, cloud) into a Habit, or null if unusable. */
export function sanitizeHabit(x: unknown): Habit | null {
  if (!x || typeof x !== 'object') return null;
  const h = x as Record<string, unknown>;
  if (typeof h.id !== 'string' || !h.id || typeof h.name !== 'string') return null;
  const name = cleanName(h.name);
  if (!name) return null;
  return { id: h.id, name, createdAt: isDayKey(h.createdAt) ? h.createdAt : dayKey(), logs: normalizeLogs(h.logs) };
}

export function sanitizeHabits(xs: unknown): Habit[] {
  if (!Array.isArray(xs)) return [];
  const seen = new Set<string>();
  const out: Habit[] = [];
  for (const x of xs) {
    const h = sanitizeHabit(x);
    if (h && !seen.has(h.id)) {
      seen.add(h.id);
      out.push(h);
    }
  }
  return out;
}

export const canAddHabit = (count: number, isPro: boolean) => isPro || count < FREE_HABIT_LIMIT;

/**
 * Union-merge remote habits into local ones. Logs are only ever added, never removed, so a
 * device with less history can never erase one with more. Local names win (they may have
 * unsynced renames). Habits in `deleted` are never resurrected. Idempotent.
 */
export function mergeHabits(local: Habit[], remote: Habit[], deleted: string[] = []) {
  let changed = false;
  const gone = new Set(deleted);
  const merged = local.map((h) => {
    const r = remote.find((x) => x.id === h.id);
    if (!r) return h;
    const logs = normalizeLogs([...h.logs, ...r.logs]);
    if (logs.length === h.logs.length) return h;
    changed = true;
    return { ...h, logs };
  });
  const have = new Set(local.map((h) => h.id));
  for (const r of remote) {
    if (!have.has(r.id) && !gone.has(r.id)) {
      merged.push(r);
      changed = true;
    }
  }
  return { habits: merged, changed };
}
