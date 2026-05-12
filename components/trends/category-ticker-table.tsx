import { formatCurrency } from "@/lib/utils";
import { Sparkline } from "./sparkline";
import type { CategoryTrendRow } from "@/lib/actions/trends";

interface Props {
  rows: CategoryTrendRow[];
  limit?: number;
}

export function CategoryTickerTable({ rows, limit }: Props) {
  if (rows.length === 0) {
    return <p className="text-muted-base text-sm text-center py-8">No tagged expenses this month.</p>;
  }
  const visible = limit ? rows.slice(0, limit) : rows;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[9px] uppercase tracking-widest text-muted-base font-bold px-1">
        <span>Category</span>
        <div className="flex gap-6">
          <span className="w-20 text-right">Last</span>
          <span className="w-16 text-right">Change</span>
          <span className="w-24 text-right">Trend</span>
        </div>
      </div>
      <div className="rounded-2xl bg-white/[0.03] border border-accent-purple/10 divide-y divide-white/5">
        {visible.map((t) => {
          const up = t.deltaPct > 0;
          const flat = t.deltaPct === 0;
          return (
            <div key={`${t.tagId ?? "null"}-${t.name}`} className="px-4 py-3 flex items-center gap-3">
              <span className="text-lg">{t.emoji}</span>
              <p className="flex-1 text-foreground font-medium text-sm font-mono">{t.name.toUpperCase()}</p>
              <div className="flex items-center gap-6">
                <p className="w-20 text-right text-foreground text-sm font-mono tabular-nums font-bold">
                  {formatCurrency(t.currentTotal)}
                </p>
                {t.isNew ? (
                  <p className="w-16 text-right text-xs font-mono font-bold text-red-400">▲ NEW</p>
                ) : flat && t.currentTotal === 0 && t.lastMonthTotal === 0 ? (
                  <p className="w-16 text-right text-xs font-mono font-bold text-muted-base">—</p>
                ) : (
                  <p className={`w-16 text-right text-xs font-mono font-bold ${
                    flat ? "text-muted-base" : up ? "text-red-400" : "text-green-400"
                  }`}>
                    {flat ? "—" : `${up ? "▲" : "▼"} ${Math.abs(t.deltaPct)}%`}
                  </p>
                )}
                <div className="w-24 flex justify-end">
                  <Sparkline values={t.sparkline} up={t.isNew ? true : up} width={84} height={24} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
