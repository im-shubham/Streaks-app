import { heatmapWeeks } from '@/lib/streak';

export function Heatmap({ logs, today, weeks = 20 }: { logs: string[]; today: string; weeks?: number }) {
  const grid = heatmapWeeks(logs, weeks, today);
  return (
    <div className="overflow-x-auto" role="img" aria-label={`Completion heatmap, last ${weeks} weeks`} data-testid="heatmap">
      <div className="inline-flex gap-1">
        {grid.map((col, i) => (
          <div key={i} className="flex flex-col gap-1">
            {col.map((c) => (
              <span
                key={c.key}
                title={c.future ? undefined : `${c.key}${c.done ? ' ✓' : ''}`}
                data-done={c.done}
                className={`h-3.5 w-3.5 rounded-[4px] ${c.future ? 'opacity-0' : c.done ? 'bg-lime' : 'bg-char'}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
