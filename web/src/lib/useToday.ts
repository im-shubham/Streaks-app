'use client';
import { useEffect, useState } from 'react';
import { dayKey } from './streak';

/** Local "today" that rolls over at local midnight and when the tab returns from background. */
export function useToday(): string {
  const [today, setToday] = useState(() => dayKey());
  useEffect(() => {
    const sync = () => setToday(dayKey());
    const id = setInterval(sync, 30_000);
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('focus', sync);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('focus', sync);
    };
  }, []);
  return today;
}
