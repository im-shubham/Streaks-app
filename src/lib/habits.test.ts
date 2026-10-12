import test from 'node:test';
import assert from 'node:assert/strict';
import { isDayKey, mergeHabits, normalizeLogs, sanitizeHabit } from './habits';

const h = (id: string, logs: string[]) => ({ id, name: id, createdAt: '2026-03-01', logs });

test('isDayKey validates real calendar days', () => {
  assert.ok(isDayKey('2026-02-28'));
  assert.ok(isDayKey('2028-02-29'));
  assert.ok(!isDayKey('2026-02-29'));
  assert.ok(!isDayKey('2026-2-1'));
  assert.ok(!isDayKey(20260301));
});
test('normalizeLogs dedupes, sorts, drops junk', () => {
  assert.deepEqual(normalizeLogs(['2026-03-02', '2026-03-01', '2026-03-02', 'x', null]), ['2026-03-01', '2026-03-02']);
  assert.deepEqual(normalizeLogs(undefined), []);
});
test('sanitizeHabit rejects unusable data', () => {
  assert.equal(sanitizeHabit({ id: 'a', name: '   ' }), null);
  assert.equal(sanitizeHabit('str'), null);
  assert.equal(sanitizeHabit({ id: 'a', name: 'ok' })?.logs.length, 0);
});
test('mergeHabits is a union, idempotent, and reports changes', () => {
  const local = [h('a', ['2026-03-02']), h('b', [])];
  const r1 = mergeHabits(local, [h('a', ['2026-03-01']), h('c', ['2026-03-05'])]);
  assert.equal(r1.changed, true);
  assert.deepEqual(r1.habits.map((x) => x.id), ['a', 'b', 'c']);
  assert.deepEqual(r1.habits[0].logs, ['2026-03-01', '2026-03-02']);
  const r2 = mergeHabits(r1.habits, [h('a', ['2026-03-01']), h('c', ['2026-03-05'])]);
  assert.equal(r2.changed, false);
  assert.equal(r2.habits, r2.habits);
});
test('habits merge independently', () => {
  const r = mergeHabits([h('a', ['2026-03-02']), h('b', ['2026-03-03'])], [h('a', ['2026-03-09'])]);
  assert.deepEqual(r.habits[1].logs, ['2026-03-03']);
});
