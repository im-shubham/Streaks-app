import { dayKey } from './streak';

export interface Habit {
  id: string;
  name: string;
  createdAt: string;
  logs: string[]; // unique, sorted day keys
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** A real calendar day key, e.g. rejects "2026-02-31". */
export function isDayKey(v: unknown): v is string {
  if (typeof v !== 'string' || !DAY_RE.test(v)) return false;
  const [y, m, d] = v.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d)) === v;
}

/** Drops invalid entries and duplicates; returns ascending order. */
export function normalizeLogs(logs: unknown): string[] {
  if (!Array.isArray(logs)) return [];
  return [...new Set(logs.filter(isDayKey))].sort();
}

/** Validates untrusted data (disk, cloud) into a Habit, or null if unusable. */
export function sanitizeHabit(x: unknown): Habit | null {
  if (!x || typeof x !== 'object') return null;
  const h = x as Record<string, unknown>;
  if (typeof h.id !== 'string' || !h.id || typeof h.name !== 'string' || !h.name.trim()) return null;
  return {
    id: h.id,
    name: h.name.trim().slice(0, 28),
    createdAt: isDayKey(h.createdAt) ? h.createdAt : dayKey(),
    logs: normalizeLogs(h.logs),
  };
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

/**
 * Union-merge remote habits into local ones. Logs are only ever added, never removed, so a
 * device with less history can never erase a device with more. Idempotent.
 */
export function mergeHabits(local: Habit[], remote: Habit[]): { habits: Habit[]; changed: boolean } {
  let changed = false;
  const byId = new Map(local.map((h) => [h.id, h]));
  const merged = local.map((h) => {
    const r = remote.find((x) => x.id === h.id);
    if (!r) return h;
    const logs = normalizeLogs([...h.logs, ...r.logs]);
    if (logs.length === h.logs.length) return h;
    changed = true;
    return { ...h, logs };
  });
  for (const r of remote) {
    if (!byId.has(r.id)) {
      merged.push(r);
      changed = true;
    }
  }
  return { habits: merged, changed };
}
