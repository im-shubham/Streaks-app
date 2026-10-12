'use client';
import { motion } from 'motion/react';
import { lastSevenDays } from '@/lib/streak';

const LET = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function DotTracker({ logs, today }: { logs: string[]; today: string }) {
  const days = lastSevenDays(logs, today);
  return (
    <ol className="flex justify-center gap-3" aria-label="Last seven days" data-testid="dots">
      {days.map((d) => {
        const dow = new Date(Number(d.key.slice(0, 4)), Number(d.key.slice(5, 7)) - 1, Number(d.key.slice(8))).getDay();
        return (
          <li key={d.key} className="flex flex-col items-center gap-2">
            <motion.span
              layout
              data-done={d.done}
              aria-label={`${d.key}: ${d.done ? 'completed' : 'not completed'}${d.isToday ? ' (today)' : ''}`}
              role="img"
              className={`block h-3.5 w-3.5 rounded-full ${d.done ? 'bg-lime shadow-[0_0_10px_rgba(198,255,61,.6)]' : 'bg-edge'} ${d.isToday && !d.done ? 'ring-1 ring-lime/60 ring-offset-2 ring-offset-ink' : ''}`}
              animate={d.done && d.isToday ? { scale: [1, 1.5, 1] } : undefined}
            />
            <span className="text-[10px] text-mute" aria-hidden>{LET[dow]}</span>
          </li>
        );
      })}
    </ol>
  );
}
