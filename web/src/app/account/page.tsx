'use client';
import { FormEvent, useState } from 'react';
import { useApp } from '@/components/Providers';
import { Btn } from '@/components/ui';

const msg = (e: unknown) => {
  const c = (e as { code?: string }).code ?? '';
  if (c.includes('invalid-credential') || c.includes('wrong-password') || c.includes('user-not-found')) return 'Incorrect email or password.';
  if (c.includes('email-already-in-use')) return 'That email already has an account. Try signing in.';
  if (c.includes('weak-password')) return 'Password must be at least 6 characters.';
  if (c.includes('invalid-email')) return 'Enter a valid email address.';
  if (c.includes('network')) return 'Network error. Check your connection and try again.';
  return 'Something went wrong. Please try again.';
};

export default function Account() {
  const { user, configured, google, email, reset, signOut, sync, online } = useApp();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [em, setEm] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (f: () => Promise<void>, ok = '') => {
    setErr(''); setInfo(''); setBusy(true);
    try { await f(); setInfo(ok); } catch (e) { setErr(msg(e)); } finally { setBusy(false); }
  };

  if (!configured) return (
    <div className="space-y-3 pt-4"><h1 className="text-3xl font-semibold">Account</h1>
      <p className="text-sm text-mute" data-testid="not-configured">Sign-in isn’t configured on this deployment, so Streaks runs in guest mode: everything is saved on this device only.</p></div>
  );
  if (user) {
    const risky = !online || sync === 'error' || sync === 'syncing';
    return (
      <div className="space-y-6 pt-4">
        <h1 className="text-3xl font-semibold tracking-tight">Account</h1>
        <p className="text-sm text-mute">Signed in as <span className="text-white" data-testid="email">{user.email ?? user.displayName}</span></p>
        <p className="text-xs text-mute" role="status">Sync: {online ? sync : 'offline'}</p>
        {risky && <p className="text-xs text-amber-300">Some changes may not be synced yet. Signing out clears this device, so wait until sync says “synced”.</p>}
        <Btn variant="ghost" onClick={() => run(signOut)} disabled={busy}>Sign out</Btn>
      </div>
    );
  }
  return (
    <div className="space-y-6 pt-4">
      <div><h1 className="text-3xl font-semibold tracking-tight">Save your streaks</h1><p className="mt-2 text-sm text-mute">Sign in to back up and sync. Your current guest progress is kept and added to your account.</p></div>
      <Btn className="w-full" onClick={() => run(google)} disabled={busy}>Continue with Google</Btn>
      <form onSubmit={(e: FormEvent) => { e.preventDefault(); run(() => email(mode, em, pw)); }} className="space-y-3">
        <label className="block text-xs text-mute" htmlFor="em">Email</label>
        <input id="em" type="email" autoComplete="email" required value={em} onChange={(e) => setEm(e.target.value)} className="w-full rounded-xl border border-edge bg-transparent px-4 py-3 outline-none focus:border-lime" />
        <label className="block text-xs text-mute" htmlFor="pw">Password</label>
        <input id="pw" type="password" autoComplete={mode === 'in' ? 'current-password' : 'new-password'} required minLength={6} value={pw} onChange={(e) => setPw(e.target.value)} className="w-full rounded-xl border border-edge bg-transparent px-4 py-3 outline-none focus:border-lime" />
        <Btn type="submit" variant="ghost" className="w-full" disabled={busy}>{mode === 'in' ? 'Sign in' : 'Create account'}</Btn>
      </form>
      <div className="flex justify-between text-xs text-mute">
        <button className="underline" onClick={() => setMode(mode === 'in' ? 'up' : 'in')}>{mode === 'in' ? 'Create an account' : 'I already have an account'}</button>
        <button className="underline" onClick={() => em ? run(() => reset(em), 'Password reset email sent (if the account exists).') : setErr('Enter your email above first.')}>Forgot password?</button>
      </div>
      <p role="alert" className="min-h-5 text-sm text-red-300">{err}</p>
      <p role="status" className="text-sm text-lime">{info}</p>
    </div>
  );
}
