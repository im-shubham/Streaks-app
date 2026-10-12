import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addDays,
  bestStreak,
  currentStreak,
  dayKey,
  diffDays,
  heatmapWeeks,
  lastSevenDays,
  successRate,
  totalDays,
} from './streak';

const T = '2026-03-10';

test('current streak counts back from today', () => {
  assert.equal(currentStreak(['2026-03-10', '2026-03-09', '2026-03-08'], T), 3);
});
test('streak survives until end of day when today is unlogged', () => {
  assert.equal(currentStreak(['2026-03-09', '2026-03-08'], T), 2);
});
test('streak breaks after a missed day', () => {
  assert.equal(currentStreak(['2026-03-08'], T), 0);
});
test('crosses month and DST boundaries', () => {
  assert.equal(currentStreak(['2026-03-01', '2026-02-28', '2026-02-27'], '2026-03-01'), 3);
  assert.equal(bestStreak(['2026-03-28', '2026-03-29', '2026-03-30']), 3);
});
test('best streak and duplicates', () => {
  assert.equal(bestStreak(['2026-01-01', '2026-01-01', '2026-01-02', '2026-01-05']), 2);
  assert.equal(bestStreak([]), 0);
});
test('success rate', () => {
  assert.equal(successRate([], T), 0);
  assert.equal(successRate(['2026-03-09', '2026-03-10'], T), 1);
  assert.equal(successRate(['2026-03-07'], T), 0.25);
});
test('dot tracker and heatmap shape', () => {
  const d = lastSevenDays(['2026-03-10'], T);
  assert.equal(d.length, 7);
  assert.ok(d[6].done && d[6].isToday);
  const h = heatmapWeeks([], 12, T);
  assert.equal(h.length, 12);
  assert.ok(h.every((w) => w.length === 7));
  assert.equal(h[11].find((c) => c.key === T)?.future, false);
});

test('empty / brand-new habit has zeroed stats', () => {
  assert.equal(currentStreak([], T), 0);
  assert.equal(bestStreak([], T), 0);
  assert.equal(totalDays([], T), 0);
  assert.equal(successRate([], T), 0);
  assert.ok(lastSevenDays([], T).every((d) => !d.done));
});
test('duplicate day entries do not inflate any stat', () => {
  const dup = ['2026-03-10', '2026-03-10', '2026-03-09', '2026-03-09'];
  assert.equal(currentStreak(dup, T), 2);
  assert.equal(bestStreak(dup, T), 2);
  assert.equal(totalDays(dup, T), 2);
  assert.equal(successRate(dup, T), 1);
});
test('missing days then returning restarts the streak but keeps best', () => {
  const logs = ['2026-03-01', '2026-03-02', '2026-03-03', '2026-03-10'];
  assert.equal(currentStreak(logs, T), 1);
  assert.equal(bestStreak(logs, T), 3);
  assert.equal(totalDays(logs, T), 4);
});
test('future-dated logs (clock skew) do not inflate stats', () => {
  const logs = ['2026-03-10', '2026-03-11', '2026-03-12'];
  assert.equal(bestStreak(logs, T), 1);
  assert.equal(totalDays(logs, T), 1);
  assert.equal(successRate(logs, T), 1);
  assert.equal(successRate(['2026-03-12'], T), 0);
});
test('dayKey uses the local calendar date in any timezone', () => {
  const orig = process.env.TZ;
  try {
    const instant = new Date('2026-03-10T20:00:00Z'); // 01:30 Mar 11 in IST, 13:00 Mar 10 in LA, 10:00 Mar 11 in Kiritimati
    process.env.TZ = 'Asia/Kolkata';
    assert.equal(dayKey(instant), '2026-03-11');
    process.env.TZ = 'America/Los_Angeles';
    assert.equal(dayKey(instant), '2026-03-10');
    process.env.TZ = 'Pacific/Kiritimati';
    assert.equal(dayKey(instant), '2026-03-11');
  } finally {
    if (orig === undefined) delete process.env.TZ;
    else process.env.TZ = orig;
  }
});
test('streaks survive DST transitions (spring forward & fall back)', () => {
  const orig = process.env.TZ;
  try {
    process.env.TZ = 'America/Los_Angeles';
    assert.equal(addDays('2026-03-07', 2), '2026-03-09'); // spring forward on 03-08
    assert.equal(currentStreak(['2026-03-07', '2026-03-08', '2026-03-09'], '2026-03-09'), 3);
    assert.equal(addDays('2026-10-31', 2), '2026-11-02'); // fall back on 11-01
    assert.equal(bestStreak(['2026-10-31', '2026-11-01', '2026-11-02'], '2026-11-02'), 3);
    assert.equal(diffDays('2026-03-01', '2026-03-31'), 30);
  } finally {
    if (orig === undefined) delete process.env.TZ;
    else process.env.TZ = orig;
  }
});
