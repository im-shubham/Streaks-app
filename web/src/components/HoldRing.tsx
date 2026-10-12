'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react';
import { createHold, Hold } from '@/lib/holdMachine';

const R = 118;
const C = 2 * Math.PI * R;
export const HOLD_MS = 1000;

interface Props {
  done: boolean;
  disabled?: boolean;
  label: string;
  streak: number;
  onComplete: () => void;
}

export function HoldRing({ done, disabled, label, streak, onComplete }: Props) {
  const gid = useId();
  const reduce = useReducedMotion();
  const progress = useMotionValue(done ? 1 : 0);
  const offset = useTransform(progress, (p) => C * (1 - p));
  const fillOpacity = useTransform(progress, [0, 1], [0.04, 0.5]);
  const scale = useTransform(progress, [0, 1], [1, 1.025]);
  const [pressing, setPressing] = useState(false);
  const holdRef = useRef<Hold | null>(null);
  const raf = useRef(0);
  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;

  // Settle the visual when the logged state changes from elsewhere (button, other tab, day rollover).
  useEffect(() => {
    if (!holdRef.current?.active) animate(progress, done ? 1 : 0, { duration: reduce ? 0 : 0.4 });
  }, [done, progress, reduce]);

  const stop = (reset: boolean) => {
    cancelAnimationFrame(raf.current);
    holdRef.current?.cancel();
    setPressing(false);
    if (reset && !done) animate(progress, 0, { duration: reduce ? 0 : 0.35, ease: 'easeOut' });
  };
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  // Losing the page (tab switch, app switcher, lock screen) must cancel a hold in progress.
  useEffect(() => {
    const off = () => holdRef.current?.active && stop(true);
    document.addEventListener('visibilitychange', off);
    window.addEventListener('blur', off);
    return () => {
      document.removeEventListener('visibilitychange', off);
      window.removeEventListener('blur', off);
    };
  });

  const begin = () => {
    if (done || disabled || holdRef.current?.active) return;
    holdRef.current = createHold(HOLD_MS, () => {
      cancelAnimationFrame(raf.current);
      setPressing(false);
      progress.set(1);
      completeRef.current();
    });
    holdRef.current.start(performance.now());
    setPressing(true);
    const loop = (now: number) => {
      const h = holdRef.current;
      if (!h?.active) return;
      progress.set(h.tick(now));
      if (h.active) raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
  };

  return (
    <div className="relative mx-auto grid aspect-square w-[min(72vw,320px,40dvh)] place-items-center">
      <motion.button
        type="button"
        aria-label={done ? `${label}: completed today` : `Hold to log ${label}`}
        aria-pressed={done}
        aria-describedby={`${gid}-hint`}
        disabled={disabled}
        data-testid="hold-button"
        data-state={done ? 'done' : pressing ? 'holding' : 'idle'}
        style={{ scale: reduce ? 1 : scale, touchAction: 'none', WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}
        className="absolute inset-0 select-none rounded-full outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-4 focus-visible:ring-offset-ink"
        onPointerDown={(e) => {
          if (e.button !== 0 && e.pointerType === 'mouse') return;
          e.currentTarget.setPointerCapture?.(e.pointerId);
          begin();
        }}
        onPointerUp={() => stop(true)}
        onPointerCancel={() => stop(true)}
        onLostPointerCapture={() => stop(true)}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
            e.preventDefault();
            begin();
          }
        }}
        onKeyUp={(e) => (e.key === ' ' || e.key === 'Enter') && stop(true)}
        onBlur={() => holdRef.current?.active && stop(true)}
      >
        <svg viewBox="0 0 280 280" className="h-full w-full -rotate-90" aria-hidden>
          <defs>
            <linearGradient id={`${gid}-g`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#e6ff8a" />
              <stop offset="1" stopColor="#8fe000" />
            </linearGradient>
            <radialGradient id={`${gid}-f`}>
              <stop offset="0" stopColor="#c6ff3d" stopOpacity="0.55" />
              <stop offset="1" stopColor="#c6ff3d" stopOpacity="0" />
            </radialGradient>
          </defs>
          <motion.circle cx="140" cy="140" r="104" fill={`url(#${gid}-f)`} style={{ opacity: fillOpacity }} />
          <circle cx="140" cy="140" r={R} fill="none" stroke="#26262a" strokeWidth="10" />
          <motion.circle
            cx="140" cy="140" r={R} fill="none" stroke={`url(#${gid}-g)`} strokeWidth="10" strokeLinecap="round"
            strokeDasharray={C} style={{ strokeDashoffset: offset, filter: 'drop-shadow(0 0 8px rgba(198,255,61,.55))' }}
          />
        </svg>
        <span className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          {done ? (
            <motion.span initial={reduce ? false : { scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }}>
              <span className="block text-7xl font-semibold tabular-nums text-lime" data-testid="streak-count">{streak}</span>
              <span className="mt-1 block text-xs uppercase tracking-[0.22em] text-mute">day streak</span>
            </motion.span>
          ) : (
            <span>
              <span className="block text-2xl font-medium">{pressing ? 'Keep holding' : 'Hold'}</span>
              <span className="mt-1 block text-xs uppercase tracking-[0.22em] text-mute">to log today</span>
            </span>
          )}
        </span>
      </motion.button>
      <span id={`${gid}-hint`} className="sr-only">
        Press and hold for one second to complete. Keyboard: hold Space or Enter, or use the Log today button.
      </span>
    </div>
  );
}
