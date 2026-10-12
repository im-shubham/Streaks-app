'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';
import { useApp } from './Providers';
import { useStore } from '@/store/useStore';

const TABS = [
  { href: '/', label: 'Today' },
  { href: '/insights', label: 'Insights' },
  { href: '/habits', label: 'Habits' },
  { href: '/account', label: 'Account' },
];

function Banner() {
  const { online, sync, user, configured } = useApp();
  let msg: string | null = null;
  let tone = 'text-mute';
  if (!online) msg = 'Offline — changes are saved on this device and will sync when you reconnect.';
  else if (user && sync === 'error') {
    msg = 'Sync problem — your data is safe on this device. Retrying automatically.';
    tone = 'text-amber-300';
  }
  else if (user && sync === 'syncing') msg = 'Syncing…';
  else if (!user && configured) msg = null;
  if (!msg) return null;
  return <div role="status" data-testid="banner" className={`mx-auto mb-2 max-w-md px-4 text-center text-xs ${tone}`}>{msg}</div>;
}

export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const hydrated = useStore((s) => s.hydrated);
  const hasHabit = useStore((s) => s.habits.length > 0);
  const showNav = hydrated && hasHabit;
  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
      <header className="flex items-center justify-between py-2">
        <Link href="/" className="text-sm font-semibold tracking-[0.3em] text-lime">STREAKS</Link>
        {showNav && (
          <nav aria-label="Main" className="hidden gap-1 sm:flex">
            {TABS.map((t) => (
              <Link key={t.href} href={t.href} aria-current={path === t.href ? 'page' : undefined} className={`rounded-full px-4 py-2 text-sm ${path === t.href ? 'bg-char text-white' : 'text-mute hover:text-white'}`}>{t.label}</Link>
            ))}
          </nav>
        )}
      </header>
      <Banner />
      <main id="main" className="flex-1 pb-24 sm:pb-8">
        {hydrated ? children : <div className="grid h-[60dvh] place-items-center text-sm text-mute" role="status">Loading…</div>}
      </main>
      {showNav && (
        <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-10 border-t border-edge bg-black/85 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
          <ul className="mx-auto flex max-w-md justify-around">
            {TABS.map((t) => (
              <li key={t.href}>
                <Link href={t.href} aria-current={path === t.href ? 'page' : undefined} className={`flex min-h-14 items-center px-3 text-xs ${path === t.href ? 'text-lime' : 'text-mute'}`}>{t.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
