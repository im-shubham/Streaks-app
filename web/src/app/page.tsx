'use client';
import { useStore } from '@/store/useStore';
import { Onboarding } from '@/components/Onboarding';
import { Home } from '@/components/Home';

export default function Page() {
  const has = useStore((s) => s.habits.length > 0);
  return has ? <Home /> : <Onboarding />;
}
