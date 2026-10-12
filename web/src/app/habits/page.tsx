'use client';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { habitStore, useStore } from '@/store/useStore';
import { bestStreak, currentStreak } from '@/lib/streak';
import { useToday } from '@/lib/useToday';
import { Btn, Modal } from '@/components/ui';
import { NAME_MAX } from '@/lib/habits';

export default function Habits() {
  const router = useRouter();
  const today = useToday();
  const habits = useStore((s) => s.habits);
  const activeId = useStore((s) => s.activeId);
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [confirm, setConfirm] = useState<string | null>(null);
  const target = habits.find((h) => h.id === confirm);

  const add = (e: FormEvent) => {
    e.preventDefault();
    const r = habitStore.getState().addHabit(name);
    if (r === 'limit') router.push('/pro');
    if (r === 'ok') setName('');
  };
  return (
    <div className="space-y-8 pt-4">
      <div><p className="text-xs uppercase tracking-[0.25em] text-mute">Habits</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Your habits</h1></div>
      <ul className="space-y-3">
        {habits.map((h) => (
          <li key={h.id} data-testid="habit-row" className={`rounded-2xl border p-4 ${h.id === activeId ? 'border-lime/60' : 'border-edge'}`}>
            {editing === h.id ? (
              <form onSubmit={(e) => { e.preventDefault(); habitStore.getState().renameHabit(h.id, draft); setEditing(null); }} className="flex gap-2">
                <label className="sr-only" htmlFor={`r-${h.id}`}>Habit name</label>
                <input id={`r-${h.id}`} autoFocus value={draft} maxLength={NAME_MAX} onChange={(e) => setDraft(e.target.value)} className="min-w-0 flex-1 rounded-xl border border-edge bg-black px-3 py-2 outline-none focus:border-lime" />
                <Btn type="submit" disabled={!draft.trim()}>Save</Btn>
                <Btn type="button" variant="ghost" onClick={() => setEditing(null)}>Cancel</Btn>
              </form>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div><div className="font-medium">{h.name}</div><div className="mt-1 text-xs text-mute">{currentStreak(h.logs, today)} day streak · best {bestStreak(h.logs, today)} · {h.logs.length} logged</div></div>
                  {h.id === activeId && <span className="rounded-full bg-lime/15 px-2 py-1 text-[10px] uppercase tracking-widest text-lime">Active</span>}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {h.id !== activeId && <Btn variant="ghost" onClick={() => habitStore.getState().setActive(h.id)}>Select</Btn>}
                  <Btn variant="ghost" onClick={() => { setEditing(h.id); setDraft(h.name); }}>Rename</Btn>
                  <Btn variant="danger" onClick={() => setConfirm(h.id)}>Delete</Btn>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
      <form onSubmit={add} className="flex gap-2">
        <label className="sr-only" htmlFor="new">New habit</label>
        <input id="new" value={name} maxLength={NAME_MAX} onChange={(e) => setName(e.target.value)} placeholder="Add another habit" className="min-w-0 flex-1 rounded-full border border-edge bg-transparent px-4 outline-none focus:border-lime" />
        <Btn type="submit" disabled={!name.trim()}>Add</Btn>
      </form>
      <Modal open={!!target} onClose={() => setConfirm(null)} title="Delete this habit?">
        <p className="text-sm text-mute">“{target?.name}” and its {target?.logs.length ?? 0} logged days will be permanently deleted{' '}from this device and your account.</p>
        <div className="mt-5 flex justify-end gap-2">
          <Btn variant="ghost" onClick={() => setConfirm(null)}>Cancel</Btn>
          <Btn variant="danger" data-testid="confirm-delete" onClick={() => { if (confirm) habitStore.getState().deleteHabit(confirm); setConfirm(null); }}>Delete</Btn>
        </div>
      </Modal>
    </div>
  );
}
