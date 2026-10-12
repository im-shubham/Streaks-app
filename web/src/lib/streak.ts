/** Pure streak math. Days are local-calendar keys: "YYYY-MM-DD". */

export const dayKey = (d: Date = new Date()): string => {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

const parse = (k: string): Date => {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (k: string, n: number): string => {
  const d = parse(k);
  d.setDate(d.getDate() + n);
  return dayKey(d);
};

/** Whole days from a to b (DST-safe: compares UTC midnights of the calendar fields). */
export const diffDays = (a: string, b: string): number => {
  const A = parse(a);
  const B = parse(b);
  return Math.round(
    (Date.UTC(B.getFullYear(), B.getMonth(), B.getDate()) - Date.UTC(A.getFullYear(), A.getMonth(), A.getDate())) / 86400000,
  );
};

/** Logs dated after `today` (clock skew, travel) never count toward stats. */
const upTo = (logs: string[], today: string) => logs.filter((l) => l <= today);

export const totalDays = (logs: string[], today: string = dayKey()): number => new Set(upTo(logs, today)).size;

/** Today not being logged yet doesn't break a streak that ended yesterday. */
export function currentStreak(logs: string[], today: string = dayKey()): number {
  const set = new Set(upTo(logs, today));
  let cursor = set.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (set.has(cursor)) {
    n++;
    cursor = addDays(cursor, -1);
  }
  return n;
}

export function bestStreak(logs: string[], today: string = dayKey()): number {
  const days = [...new Set(upTo(logs, today))].sort();
  let best = 0;
  let run = 0;
  days.forEach((d, i) => {
    run = i > 0 && diffDays(days[i - 1], d) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
  });
  return best;
}

/** Share of days since the first log (inclusive of today) that were logged, 0..1. */
export function successRate(logs: string[], today: string = dayKey()): number {
  const days = upTo(logs, today);
  if (days.length === 0) return 0;
  const first = [...days].sort()[0];
  return Math.min(1, new Set(days).size / Math.max(1, diffDays(first, today) + 1));
}

/** The last 7 days ending today, oldest first. */
export function lastSevenDays(logs: string[], today: string = dayKey()) {
  const set = new Set(logs);
  return Array.from({ length: 7 }, (_, i) => {
    const k = addDays(today, i - 6);
    return { key: k, done: set.has(k), isToday: k === today };
  });
}

/** Heatmap grid: `weeks` columns of 7 days (Sun..Sat), ending with the current week. */
export function heatmapWeeks(logs: string[], weeks = 20, today: string = dayKey()) {
  const set = new Set(logs);
  const start = addDays(today, -(parse(today).getDay() + 7 * (weeks - 1)));
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const k = addDays(start, w * 7 + d);
      return { key: k, done: set.has(k), future: diffDays(today, k) > 0 };
    }),
  );
}

/** Completed days per month (most recent first), for the history list. */
export function monthlyHistory(logs: string[], today: string = dayKey()) {
  const by = new Map<string, number>();
  for (const l of new Set(upTo(logs, today))) by.set(l.slice(0, 7), (by.get(l.slice(0, 7)) ?? 0) + 1);
  return [...by.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)).map(([month, days]) => ({ month, days }));
}
