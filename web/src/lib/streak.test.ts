import { describe, expect, it } from 'vitest';
import { addDays, bestStreak, currentStreak, dayKey, diffDays, heatmapWeeks, lastSevenDays, monthlyHistory, successRate, totalDays } from './streak';

describe('streak math', () => {
  it('counts consecutive days ending today', () => {
    expect(currentStreak(['2026-03-08', '2026-03-09', '2026-03-10'], '2026-03-10')).toBe(3);
  });
  it('keeps a streak alive when only yesterday is logged', () => {
    expect(currentStreak(['2026-03-08', '2026-03-09'], '2026-03-10')).toBe(2);
  });
  it('breaks after a missed day', () => {
    expect(currentStreak(['2026-03-07', '2026-03-08'], '2026-03-10')).toBe(0);
  });
  it('ignores future-dated logs everywhere', () => {
    const logs = ['2026-03-10', '2026-03-11', '2026-03-12'];
    expect(currentStreak(logs, '2026-03-10')).toBe(1);
    expect(bestStreak(logs, '2026-03-10')).toBe(1);
    expect(totalDays(logs, '2026-03-10')).toBe(1);
  });
  it('computes best streak across gaps and dedupes', () => {
    expect(bestStreak(['2026-01-01', '2026-01-01', '2026-01-02', '2026-01-05', '2026-01-06', '2026-01-07'], '2026-02-01')).toBe(3);
    expect(bestStreak([], '2026-02-01')).toBe(0);
  });
  it('computes success rate from first log', () => {
    expect(successRate(['2026-03-08', '2026-03-10'], '2026-03-10')).toBeCloseTo(2 / 3);
    expect(successRate([], '2026-03-10')).toBe(0);
  });
  it('handles month, year and leap-day boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(currentStreak(['2027-12-31', '2028-01-01'], '2028-01-01')).toBe(2);
  });
  it('lastSevenDays / heatmap shapes', () => {
    const d = lastSevenDays(['2026-03-10'], '2026-03-10');
    expect(d).toHaveLength(7);
    expect(d[6]).toMatchObject({ key: '2026-03-10', done: true, isToday: true });
    const g = heatmapWeeks([], 20, '2026-03-10');
    expect(g).toHaveLength(20);
    expect(g.every((c) => c.length === 7)).toBe(true);
    expect(g.flat().filter((c) => c.future).length).toBeGreaterThan(0);
  });
  it('monthly history is newest first', () => {
    expect(monthlyHistory(['2026-01-02', '2026-02-03', '2026-02-04'], '2026-03-01')).toEqual([{ month: '2026-02', days: 2 }, { month: '2026-01', days: 1 }]);
  });
});

// Run with different TZ values via: TZ=America/New_York vitest (see package.json test:tz)
describe('timezone / DST safety', () => {
  it('diffDays is exact across DST changes', () => {
    expect(diffDays('2026-03-07', '2026-03-09')).toBe(2); // US spring forward 2026-03-08
    expect(diffDays('2026-10-31', '2026-11-02')).toBe(2); // US fall back 2026-11-01
    expect(diffDays('2026-03-28', '2026-03-30')).toBe(2); // EU spring forward
  });
  it('streak survives a DST transition', () => {
    expect(currentStreak(['2026-03-07', '2026-03-08', '2026-03-09'], '2026-03-09')).toBe(3);
    expect(currentStreak(['2026-10-31', '2026-11-01', '2026-11-02'], '2026-11-02')).toBe(3);
  });
  it('dayKey uses LOCAL calendar fields, not UTC', () => {
    expect(dayKey(new Date(2026, 5, 15, 23, 59, 59))).toBe('2026-06-15');
    expect(dayKey(new Date(2026, 5, 16, 0, 0, 1))).toBe('2026-06-16');
  });
});
