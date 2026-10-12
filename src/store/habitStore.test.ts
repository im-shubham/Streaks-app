import test from 'node:test';
import assert from 'node:assert/strict';
import { createHabitStore, FREE_HABIT_LIMIT } from './habitStore';
import type { StateStorage } from 'zustand/middleware';

const memory = (init: Record<string, string> = {}) => {
  const data = { ...init };
  const s: StateStorage & { data: Record<string, string> } = {
    data,
    getItem: (k) => data[k] ?? null,
    setItem: (k, v) => void (data[k] = v),
    removeItem: (k) => void delete data[k],
  };
  return s;
};
const tick = () => new Promise((r) => setTimeout(r, 5));
const boot = async (storage: StateStorage) => {
  const s = createHabitStore(storage);
  await tick();
  return s;
};
const T = '2026-03-10';

test('fresh install: hydrates empty, no habit, nothing crashes', async () => {
  const s = await boot(memory());
  const st = s.getState();
  assert.equal(st.hydrated, true);
  assert.deepEqual(st.habits, []);
  assert.equal(st.activeId, null);
});

test('new habit starts with empty history', async () => {
  const s = await boot(memory());
  assert.ok(s.getState().addHabit('  Daily Code  '));
  const h = s.getState().habits[0];
  assert.equal(h.name, 'Daily Code');
  assert.deepEqual(h.logs, []);
  assert.equal(s.getState().activeId, h.id);
});

test('empty / whitespace names are rejected', async () => {
  const s = await boot(memory());
  assert.equal(s.getState().addHabit('   '), false);
  assert.equal(s.getState().habits.length, 0);
});

test('completing twice on the same day records one log', async () => {
  const s = await boot(memory());
  s.getState().addHabit('Read');
  const id = s.getState().habits[0].id;
  assert.equal(s.getState().logToday(id, T), true);
  assert.equal(s.getState().logToday(id, T), false);
  assert.deepEqual(s.getState().habits[0].logs, [T]);
});

test('logging after missed days keeps all logs, sorted, no backfill', async () => {
  const s = await boot(memory());
  s.getState().addHabit('Read');
  const id = s.getState().habits[0].id;
  s.getState().logToday(id, '2026-03-10');
  s.getState().logToday(id, '2026-03-05');
  assert.deepEqual(s.getState().habits[0].logs, ['2026-03-05', '2026-03-10']);
});

test('unknown habit id is ignored', async () => {
  const s = await boot(memory());
  assert.equal(s.getState().logToday('nope', T), false);
});

test('free tier is limited to one habit; Pro lifts it', async () => {
  const s = await boot(memory());
  assert.ok(s.getState().addHabit('A'));
  assert.equal(FREE_HABIT_LIMIT, 1);
  assert.equal(s.getState().addHabit('B'), false);
  s.getState().setPro(true);
  assert.ok(s.getState().addHabit('B'));
  assert.equal(s.getState().habits.length, 2);
});

test('multiple habits keep independent histories', async () => {
  const s = await boot(memory());
  s.getState().setPro(true);
  s.getState().addHabit('A');
  s.getState().addHabit('B');
  const [a, b] = s.getState().habits;
  s.getState().logToday(a.id, '2026-03-09');
  s.getState().logToday(a.id, '2026-03-10');
  s.getState().logToday(b.id, '2026-03-10');
  const [A, B] = s.getState().habits;
  assert.deepEqual(A.logs, ['2026-03-09', '2026-03-10']);
  assert.deepEqual(B.logs, ['2026-03-10']);
  assert.notEqual(a.id, b.id);
});

test('Pro themes are gated in the store', async () => {
  const s = await boot(memory());
  s.getState().setTheme('magenta');
  assert.equal(s.getState().theme, 'volt');
  s.getState().setPro(true);
  s.getState().setTheme('magenta');
  assert.equal(s.getState().theme, 'magenta');
});

test('persistence: data survives an app restart', async () => {
  const storage = memory();
  const a = await boot(storage);
  a.getState().addHabit('Mock Test');
  const id = a.getState().habits[0].id;
  a.getState().logToday(id, '2026-03-09');
  a.getState().logToday(id, '2026-03-10');
  const b = await boot(storage); // "restart": new store, same disk
  assert.equal(b.getState().hydrated, true);
  assert.equal(b.getState().habits[0].name, 'Mock Test');
  assert.deepEqual(b.getState().habits[0].logs, ['2026-03-09', '2026-03-10']);
  assert.equal(b.getState().activeId, id);
});

test('restart does not resurrect Pro themes for a non-Pro user', async () => {
  const storage = memory({
    'streaks-v1': JSON.stringify({ state: { habits: [], theme: 'cyan', isPro: false }, version: 1 }),
  });
  assert.equal((await boot(storage)).getState().theme, 'volt');
});

test('corrupt disk data is repaired, not trusted', async () => {
  const storage = memory({
    'streaks-v1': JSON.stringify({
      version: 1,
      state: {
        habits: [
          { id: 'a', name: 'Good', createdAt: '2026-03-01', logs: ['2026-03-02', '2026-03-02', 'junk', '2026-02-31'] },
          { id: 'a', name: 'Dup id', logs: [] },
          { id: '', name: 'No id' },
          null,
        ],
        activeId: 'ghost',
        theme: 'nope',
      },
    }),
  });
  const st = (await boot(storage)).getState();
  assert.equal(st.habits.length, 1);
  assert.deepEqual(st.habits[0].logs, ['2026-03-02']);
  assert.equal(st.activeId, 'a');
  assert.equal(st.theme, 'volt');
});

test('unparseable JSON on disk still reaches hydrated (no infinite loading)', async () => {
  const st = (await boot(memory({ 'streaks-v1': '{not json' }))).getState();
  assert.equal(st.hydrated, true);
  assert.deepEqual(st.habits, []);
});

test('storage that throws on read still reaches hydrated', async () => {
  const bad: StateStorage = {
    getItem: () => {
      throw new Error('disk gone');
    },
    setItem: () => {},
    removeItem: () => {},
  };
  const st = (await boot(bad)).getState();
  assert.equal(st.hydrated, true);
});

test('async storage (like AsyncStorage) hydrates too', async () => {
  const data: Record<string, string> = {};
  const slow: StateStorage = {
    getItem: async (k) => (await tick(), data[k] ?? null),
    setItem: async (k, v) => void (data[k] = v),
    removeItem: async (k) => void delete data[k],
  };
  const a = createHabitStore(slow);
  await tick();
  await tick();
  assert.equal(a.getState().hydrated, true);
  a.getState().addHabit('X');
  await tick();
  const b = createHabitStore(slow);
  await tick();
  await tick();
  assert.equal(b.getState().habits[0]?.name, 'X');
});

test('remote merge adds history, never removes local logs', async () => {
  const s = await boot(memory());
  s.getState().addHabit('A');
  const h = s.getState().habits[0];
  s.getState().logToday(h.id, '2026-03-10');
  s.getState().mergeRemoteHabits([{ ...h, logs: ['2026-03-08', '2026-03-09'] }]);
  assert.deepEqual(s.getState().habits[0].logs, ['2026-03-08', '2026-03-09', '2026-03-10']);
  s.getState().mergeRemoteHabits([{ ...h, logs: [] }]); // empty/stale remote cannot erase
  assert.equal(s.getState().habits[0].logs.length, 3);
});

test('remote merge on a fresh device adopts habits and picks an active one', async () => {
  const s = await boot(memory());
  s.getState().mergeRemoteHabits([{ id: 'r1', name: 'Remote', createdAt: '2026-03-01', logs: ['2026-03-01'] }]);
  assert.equal(s.getState().habits[0].name, 'Remote');
  assert.equal(s.getState().activeId, 'r1');
});
