import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { createHabitStore } from './habitStore';
import { dayKey } from '@/lib/streak';
import { mergeHabits, sanitizeHabits, isDayKey } from '@/lib/habits';
import { createHold } from '@/lib/holdMachine';

const mem = () => {
  const m = new Map<string, string>();
  return { m, s: { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) } };
};
const fresh = () => createHabitStore(mem().s);

describe('habit store', () => {
  it('rejects empty names and enforces the free limit', () => {
    const s = fresh();
    expect(s.getState().addHabit('   ')).toBe('empty');
    expect(s.getState().addHabit('Code')).toBe('ok');
    expect(s.getState().addHabit('Read')).toBe('limit');
    expect(s.getState().habits).toHaveLength(1);
  });
  it('pro allows multiple habits; independent histories', () => {
    const s = fresh();
    s.getState().setPro(true);
    s.getState().addHabit('A');
    s.getState().addHabit('B');
    const [a, b] = s.getState().habits;
    s.getState().logToday(a.id, '2026-01-01');
    expect(s.getState().habits.find((h) => h.id === a.id)!.logs).toEqual(['2026-01-01']);
    expect(s.getState().habits.find((h) => h.id === b.id)!.logs).toEqual([]);
  });
  it('logs a day exactly once', () => {
    const s = fresh();
    s.getState().addHabit('A');
    const id = s.getState().habits[0].id;
    const t = dayKey();
    expect(s.getState().logToday(id, t)).toBe(true);
    expect(s.getState().logToday(id, t)).toBe(false);
    expect(s.getState().habits[0].logs).toEqual([t]);
  });
  it('rejects future and malformed days', () => {
    const s = fresh();
    s.getState().addHabit('A');
    const id = s.getState().habits[0].id;
    expect(s.getState().logToday(id, '2999-01-01')).toBe(false);
    expect(s.getState().logToday(id, '2026-02-31')).toBe(false);
    expect(s.getState().logToday(id, 'nope')).toBe(false);
    expect(s.getState().habits[0].logs).toEqual([]);
  });
  it('rename / delete / active selection', () => {
    const s = fresh();
    s.getState().setPro(true);
    s.getState().addHabit('A');
    s.getState().addHabit('B');
    const [a, b] = s.getState().habits;
    expect(s.getState().activeId).toBe(b.id);
    expect(s.getState().renameHabit(a.id, '  New   name ')).toBe(true);
    expect(s.getState().habits[0].name).toBe('New name');
    expect(s.getState().renameHabit(a.id, '  ')).toBe(false);
    s.getState().deleteHabit(b.id);
    expect(s.getState().activeId).toBe(a.id);
    expect(s.getState().deleted).toContain(b.id);
  });
  it('persists across reload and never persists Pro', async () => {
    const { s } = mem();
    const one = createHabitStore(s);
    await one.persist.rehydrate();
    one.getState().setPro(true);
    one.getState().addHabit('Persist');
    one.getState().logToday(one.getState().habits[0].id, dayKey());
    const two = createHabitStore(s);
    await two.persist.rehydrate();
    await new Promise((r) => setTimeout(r));
    expect(two.getState().hydrated).toBe(true);
    expect(two.getState().habits[0].name).toBe('Persist');
    expect(two.getState().habits[0].logs).toEqual([dayKey()]);
    expect(two.getState().isPro).toBe(false);
  });
  it('tampered Pro flag in storage is ignored; corrupt data is sanitized', async () => {
    const { s, m } = mem();
    m.set('streaks-web-v1', JSON.stringify({ version: 1, state: { isPro: true, habits: [{ id: 'x', name: 'ok', logs: ['2026-01-01', '2026-01-01', 'bad', '2026-02-30'] }, { id: '', name: '' }, 7], activeId: 'ghost' } }));
    const st = createHabitStore(s);
    await st.persist.rehydrate();
    expect(st.getState().isPro).toBe(false);
    expect(st.getState().habits).toHaveLength(1);
    expect(st.getState().habits[0].logs).toEqual(['2026-01-01']);
    expect(st.getState().activeId).toBe('x');
  });
  it('hydrates even if storage throws', async () => {
    const st = createHabitStore({ getItem: () => { throw new Error('boom'); }, setItem: () => {}, removeItem: () => {} });
    await Promise.resolve(st.persist.rehydrate()).catch(() => {});
    await new Promise((r) => setTimeout(r));
    expect(st.getState().hydrated).toBe(true);
  });
});

describe('merge & ownership', () => {
  it('union-merges logs without ever dropping local history', () => {
    const local = [{ id: 'a', name: 'A', createdAt: '2026-01-01', logs: ['2026-01-01', '2026-01-02'] }];
    const remote = [{ id: 'a', name: 'Old', createdAt: '2026-01-01', logs: ['2026-01-02', '2026-01-03'] }];
    const { habits, changed } = mergeHabits(local, remote);
    expect(changed).toBe(true);
    expect(habits[0].logs).toEqual(['2026-01-01', '2026-01-02', '2026-01-03']);
    expect(habits[0].name).toBe('A'); // local rename wins
    expect(mergeHabits(habits, remote).changed).toBe(false); // idempotent
    expect(mergeHabits(local, []).habits).toEqual(local); // empty cloud can't erase local
  });
  it('does not resurrect deleted habits', () => {
    const remote = [{ id: 'z', name: 'Z', createdAt: '2026-01-01', logs: [] }];
    expect(mergeHabits([], remote, ['z']).habits).toEqual([]);
  });
  it('guest data is adopted by first account; other account data is wiped', () => {
    const s = fresh();
    s.getState().addHabit('Guest');
    s.getState().bindOwner('u1');
    expect(s.getState().habits).toHaveLength(1);
    expect(s.getState().ownerUid).toBe('u1');
    s.getState().bindOwner('u2'); // a different user must never inherit u1's data
    expect(s.getState().habits).toHaveLength(0);
    expect(s.getState().ownerUid).toBe('u2');
  });
  it('sanitizers', () => {
    expect(isDayKey('2024-02-29')).toBe(true);
    expect(isDayKey('2026-02-29')).toBe(false);
    expect(sanitizeHabits([{ id: 'a', name: 'x' }, { id: 'a', name: 'dup' }])).toHaveLength(1);
  });
});

describe('hold state machine', () => {
  it('completes exactly once and ignores repeated start', () => {
    let n = 0;
    const h = createHold(1000, () => n++);
    h.start(0);
    h.start(10);
    expect(h.tick(500)).toBeCloseTo(0.5);
    expect(h.tick(1000)).toBe(1);
    h.tick(1100);
    h.start(1200);
    h.tick(3000);
    expect(n).toBe(1);
  });
  it('releasing early cancels and does not log', () => {
    let n = 0;
    const h = createHold(1000, () => n++);
    h.start(0);
    h.tick(600);
    h.cancel();
    expect(h.active).toBe(false);
    expect(h.tick(2000)).toBe(0);
    expect(n).toBe(0);
    h.start(3000); // can start again after cancel
    h.tick(4000);
    expect(n).toBe(1);
  });
});
