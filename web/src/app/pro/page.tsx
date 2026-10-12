'use client';
import { habitStore, useStore } from '@/store/useStore';
import { devProAllowed } from '@/lib/entitlement';
import { Btn } from '@/components/ui';
import Link from 'next/link';

const PLANS = [
  { id: 'monthly', label: 'Monthly', price: '₹49', sub: 'per month' },
  { id: 'yearly', label: 'Yearly', price: '₹199', sub: 'per year', best: true },
  { id: 'lifetime', label: 'Lifetime', price: '₹399', sub: 'pay once' },
];

export default function Pro() {
  const isPro = useStore((s) => s.isPro);
  return (
    <div className="space-y-8 pt-4">
      <div><p className="text-xs uppercase tracking-[0.25em] text-mute">Streaks Pro</p><h1 className="mt-2 text-balance text-3xl font-semibold tracking-tight">Build more than one habit.</h1>
        <p className="mt-3 text-sm text-mute">Free includes one active habit. Pro unlocks unlimited habits, each with its own streak history.</p></div>
      {isPro && <p role="status" className="rounded-2xl border border-lime/40 p-4 text-sm text-lime">Pro is active on your account.</p>}
      <ul className="space-y-3">
        {PLANS.map((p) => (
          <li key={p.id} className={`flex items-center justify-between rounded-2xl border p-4 ${p.best ? 'border-lime/60' : 'border-edge'}`}>
            <div><div className="font-medium">{p.label}{p.best && <span className="ml-2 text-[10px] uppercase tracking-widest text-lime">Best value</span>}</div><div className="text-xs text-mute">{p.sub}</div></div>
            <div className="text-xl font-semibold tabular-nums">{p.price}</div>
          </li>
        ))}
      </ul>
      <div className="space-y-2">
        <Btn disabled className="h-12 w-full" data-testid="buy">Payments coming soon</Btn>
        <p className="text-center text-xs text-mute">Payments are not configured yet, so nothing can be purchased and no charge will be made. Pro is granted only by verified purchases on your account, never from this device.</p>
      </div>
      {devProAllowed && (
        <div className="rounded-2xl border border-dashed border-amber-400/50 p-4 text-xs text-amber-200" data-testid="dev-pro">
          Development only (not in production builds, not saved).{' '}
          <button className="underline" onClick={() => habitStore.getState().setPro(!isPro)}>{isPro ? 'Disable' : 'Enable'} Pro for this session</button>
        </div>
      )}
      <Link href="/" className="block text-center text-sm text-mute hover:text-white">Not now</Link>
    </div>
  );
}
