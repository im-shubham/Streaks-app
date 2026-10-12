'use client';
import { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { habitStore, useStore } from '@/store/useStore';
import { currentStreak } from '@/lib/streak';
import { useToday } from '@/lib/useToday';
import { HoldRing } from './HoldRing';
import { DotTracker } from './DotTracker';
import { Btn } from './ui';

export function Home() {
  const today = useToday();
  const habits = useStore((s) => s.habits);
  const activeId = useStore((s) => s.activeId);
  const habit = useMemo(() => habits.find((h) => h.id === activeId) ?? habits[0], [habits, activeId]);
  if (!habit) return null;
  const done = habit.logs.includes(today);
  const streak = currentStreak(habit.logs, today);
  const log = () => habitStore.getState().logToday(habit.id, today);

  return (
    <div className="flex flex-col items-center gap-5 pt-2 sm:gap-9 sm:pt-4">
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.25em] text-mute">Today</p>
        <h1 className="mt-2 text-balance text-3xl font-semibold tracking-tight" data-testid="habit-name">{habit.name}</h1>
      </div>
      <HoldRing key={habit.id} done={done} label={habit.name} streak={streak} onComplete={log} />
      <div className="min-h-6 text-center text-sm" aria-live="polite" data-testid="status">
        <AnimatePresence mode="wait">
          {done ? (
            <motion.p key="d" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="text-lime">Done for today. See you tomorrow.</motion.p>
          ) : streak > 0 ? (
            <motion.p key="s" className="text-mute">{streak}-day streak — keep it alive.</motion.p>
          ) : (
            <motion.p key="n" className="text-mute">Start your streak today.</motion.p>
          )}
        </AnimatePresence>
      </div>
      <DotTracker logs={habit.logs} today={today} />
      {/* Accessible, non-hold alternative for keyboard / screen-reader / switch users. */}
      {!done && <Btn variant="ghost" onClick={log} data-testid="log-button">Log today</Btn>}
    </div>
  );
}
