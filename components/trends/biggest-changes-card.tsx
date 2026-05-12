import { formatCurrency } from "@/lib/utils";
import type { CategoryTrendRow } from "@/lib/actions/trends";

interface Props {
  rows: CategoryTrendRow[];
}

export function BiggestChangesCard({ rows }: Props) {
  const movers = [...rows]
    .filter((r) => r.deltaPct !== 0)
    .sort((a, b) => Math.abs(b.deltaPct) - Math.abs(a.deltaPct))
    .slice(0, 3);
  if (movers.length === 0) return null;
  return (
    <section className="space-y-2">
      <h3 className="text-foreground font-semibold text-sm">Biggest changes vs last month</h3>
      <div className="rounded-2xl bg-white/[0.03] border border-accent-purple/10 divide-y divide-white/5">
        {movers.map((c) => {
          const up = c.deltaPct > 0;
          return (
            <div key={`${c.tagId ?? "null"}-${c.name}`} className="p-3 flex items-center gap-3">
              <span className="text-xl">{c.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-foreground text-sm font-medium">{c.name}</p>
                <p className="text-muted-base text-[10px]">Now {formatCurrency(c.currentTotal)}</p>
              </div>
              <p className={`text-sm font-bold font-mono ${up ? "text-red-400" : "text-green-400"}`}>
                {up ? "▲" : "▼"} {Math.abs(c.deltaPct)}%
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
