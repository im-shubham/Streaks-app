'use client';
import { FormEvent, useState } from 'react';
import { motion } from 'motion/react';
import { habitStore } from '@/store/useStore';
import { Btn } from './ui';
import { NAME_MAX } from '@/lib/habits';

const EXAMPLES = ['Daily Code', 'CAT Preparation', 'Read 10 Pages'];

export function Onboarding() {
  const [name, setName] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    habitStore.getState().addHabit(name);
  };
  return (
    <motion.form initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} onSubmit={submit} className="flex min-h-[70dvh] flex-col justify-center gap-8">
      <h1 className="text-balance text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">What are we showing up for?</h1>
      <div>
        <label htmlFor="habit" className="sr-only">Your core habit</label>
        <input
          id="habit" value={name} onChange={(e) => setName(e.target.value)} maxLength={NAME_MAX} autoFocus autoComplete="off" enterKeyHint="go"
          placeholder="Daily Code"
          className="w-full border-0 border-b border-edge bg-transparent pb-3 text-2xl outline-none placeholder:text-edge focus:border-lime"
        />
        <div className="mt-4 flex flex-wrap gap-2">
          {EXAMPLES.map((x) => (
            <button type="button" key={x} onClick={() => setName(x)} className="min-h-9 rounded-full border border-edge px-3 text-xs text-mute hover:text-white">{x}</button>
          ))}
        </div>
      </div>
      <Btn type="submit" disabled={!name.trim()} className="h-14 text-base">Start</Btn>
      <p className="text-center text-xs text-mute">No account needed. Your progress stays on this device until you sign in.</p>
    </motion.form>
  );
}
