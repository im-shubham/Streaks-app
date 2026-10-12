'use client';
import { ButtonHTMLAttributes, ReactNode, useEffect, useRef } from 'react';

export function Btn({ variant = 'solid', className = '', ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'solid' | 'ghost' | 'danger' }) {
  const v = {
    solid: 'bg-lime text-black hover:brightness-110',
    ghost: 'border border-edge text-white hover:bg-char',
    danger: 'border border-red-500/40 text-red-300 hover:bg-red-500/10',
  }[variant];
  return (
    <button
      {...p}
      className={`min-h-11 rounded-full px-5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime disabled:opacity-40 ${v} ${className}`}
    />
  );
}

/** Accessible modal built on native <dialog> (focus trap, Esc, inert background for free). */
export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="modal-title"
      className="m-auto w-[min(92vw,420px)] rounded-3xl border border-edge bg-char p-6 text-white backdrop:bg-black/70 backdrop:backdrop-blur-sm"
    >
      <h2 id="modal-title" className="text-lg font-semibold">{title}</h2>
      <div className="mt-3">{children}</div>
    </dialog>
  );
}

export function Stat({ label, value, testid }: { label: string; value: ReactNode; testid?: string }) {
  return (
    <div className="rounded-2xl border border-edge bg-coal p-4">
      <div className="text-3xl font-semibold tabular-nums" data-testid={testid}>{value}</div>
      <div className="mt-1 text-xs uppercase tracking-[0.18em] text-mute">{label}</div>
    </div>
  );
}
