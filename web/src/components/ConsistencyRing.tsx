export function ConsistencyRing({ value }: { value: number }) {
  const R = 54, C = 2 * Math.PI * R;
  return (
    <div className="relative mx-auto h-40 w-40" role="img" aria-label={`Consistency ${Math.round(value * 100)} percent`}>
      <svg viewBox="0 0 128 128" className="-rotate-90">
        <circle cx="64" cy="64" r={R} fill="none" stroke="#26262a" strokeWidth="9" />
        <circle cx="64" cy="64" r={R} fill="none" stroke="#c6ff3d" strokeWidth="9" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - value)} style={{ transition: 'stroke-dashoffset .8s ease', filter: 'drop-shadow(0 0 6px rgba(198,255,61,.5))' }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center"><div className="text-3xl font-semibold tabular-nums" data-testid="rate">{Math.round(value * 100)}%</div><div className="text-[10px] uppercase tracking-[0.2em] text-mute">consistency</div></div>
      </div>
    </div>
  );
}
