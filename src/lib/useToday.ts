import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { dayKey } from './streak';

/** Current local day key; updates at midnight and when the app returns to the foreground. */
export function useToday(): string {
  const [today, setToday] = useState(dayKey());
  useEffect(() => {
    const refresh = () => setToday(dayKey());
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    const now = new Date();
    const msToMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime();
    const t = setTimeout(refresh, msToMidnight + 500);
    return () => {
      sub.remove();
      clearTimeout(t);
    };
  }, [today]);
  return today;
}
