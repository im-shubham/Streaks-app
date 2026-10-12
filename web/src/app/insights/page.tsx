'use client';
import { useStore } from '@/store/useStore';
import { useToday } from '@/lib/useToday';
import { bestStreak, currentStreak, monthlyHistory, successRate, totalDays } from '@/lib/streak';
import { ConsistencyRing } from '@/components/ConsistencyRing';
import { Heatmap } from '@/components/Heatmap';
import { Stat } from '@/components/ui';
import Link from 'next/link';

const monthName = (m: string) => new Date(Number(m.slice(0, 4)), Number(m.slice(5)) - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

export default function Insights() {
  const today = useToday();
  const habits = useStore((s) => s.habits);
  const activeId = useStore((s) => s.activeId);
  const habit = habits.find((h) => h.id === activeId) ?? habits[0];
  if (!habit) return <p className="pt-10 text-center text-mute">Create a habit first. <Link className="text-lime" href="/">Start</Link></p>;
  const logs = habit.logs;
  return (
    <div className="space-y-8 pt-4">
      <div><p className="text-xs uppercase tracking-[0.25em] text-mute">Insights</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">{habit.name}</h1></div>
      <ConsistencyRing value={successRate(logs, today)} />
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Current streak" value={currentStreak(logs, today)} testid="stat-current" />
        <Stat label="Best streak" value={bestStreak(logs, today)} testid="stat-best" />
        <Stat label="Days completed" value={totalDays(logs, today)} testid="stat-total" />
        <Stat label="Success rate" value={`${Math.round(successRate(logs, today) * 100)}%`} testid="stat-rate" />
      </div>
      <section aria-labelledby="hm"><h2 id="hm" className="mb-3 text-sm font-medium text-mute">Last 20 weeks</h2><Heatmap logs={logs} today={today} /></section>
      <section aria-labelledby="hist">
        <h2 id="hist" className="mb-3 text-sm font-medium text-mute">History</h2>
        {monthlyHistory(logs, today).length === 0 ? <p className="text-sm text-mute">No completed days yet.</p> : (
          <ul className="divide-y divide-edge rounded-2xl border border-edge">
            {monthlyHistory(logs, today).map((m) => (
              <li key={m.month} className="flex justify-between px-4 py-3 text-sm"><span>{monthName(m.month)}</span><span className="tabular-nums text-lime">{m.days} {m.days === 1 ? 'day' : 'days'}</span></li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
