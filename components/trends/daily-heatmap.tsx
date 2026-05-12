import { formatCurrency } from "@/lib/utils";
import type { DailySpendPoint } from "@/lib/actions/trends";

interface Props {
  points: DailySpendPoint[];
  year: number;
  month: number;
}

export function DailyHeatmap({ points, year, month }: Props) {
  const startWeekday = new Date(year, month - 1, 1).getDay();
  const max = Math.max(...points.map((p) => p.total)) || 1;

  const cells: ({ day: number; value: number } | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  points.forEach((p) => cells.push({ day: p.day, value: p.total }));
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="rounded-2xl bg-white/[0.03] border border-accent-purple/10 p-4">
      <div className="grid grid-cols-7 gap-1 text-center text-[9px] text-muted-base mb-1">
        {["S","M","T","W","T","F","S"].map((d, i) => <span key={i}>{d}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((c, i) => {
          if (!c) return <span key={i} className="w-full aspect-square rounded-sm bg-transparent" />;
          const alpha = c.value > 0 ? 0.1 + (c.value / max) * 0.9 : 0;
          return (
            <div
              key={i}
              className="w-full aspect-square rounded-sm flex items-center justify-center text-[8px] text-foreground/60"
              style={{ background: c.value > 0 ? `rgba(236, 72, 153, ${alpha})` : "rgba(255,255,255,0.03)" }}
              title={`Day ${c.day}: ${formatCurrency(c.value)}`}
            >
              {c.day}
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between mt-3 text-[10px] text-muted-base">
        <span>Less</span>
        <div className="flex gap-1">
          {[0.1, 0.3, 0.55, 0.8, 1].map((a, i) => (
            <span key={i} className="w-3 h-3 rounded-sm" style={{ background: `rgba(236, 72, 153, ${a})` }} />
          ))}
        </div>
        <span>More</span>
      </div>
    </div>
  );
}
