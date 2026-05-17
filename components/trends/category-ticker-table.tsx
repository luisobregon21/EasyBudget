import { formatCurrency } from "@/lib/utils";
import { Sparkline } from "./sparkline";
import type { CategoryTrendRow } from "@/lib/actions/trends";
import { IconTile } from "@/components/ui/icon-tile";
import { tagIcon } from "@/lib/icons";

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
      {/* Header — mobile shows only Category/Last; desktop shows all three columns */}
      <div className="flex items-center justify-between text-[9px] uppercase tracking-widest text-muted-base font-bold px-1">
        <span>Category</span>
        <div className="flex gap-3 sm:gap-6">
          <span className="w-16 sm:w-20 text-right">Last</span>
          <span className="w-12 sm:w-16 text-right">Change</span>
          <span className="hidden sm:block w-24 text-right">Trend</span>
        </div>
      </div>
      <div className="rounded-2xl bg-white/[0.03] border border-accent-purple/10 divide-y divide-white/5 overflow-hidden">
        {visible.map((t) => {
          const up = t.deltaPct > 0;
          const flat = t.deltaPct === 0;
          return (
            <div key={`${t.tagId ?? "null"}-${t.name}`} className="px-3 sm:px-4 py-3 flex items-center gap-2 sm:gap-3 min-w-0">
              <IconTile icon={tagIcon(t.name)} />
              <p className="flex-1 min-w-0 text-foreground font-medium text-sm font-mono truncate">{t.name.toUpperCase()}</p>
              <div className="flex items-center gap-3 sm:gap-6 shrink-0">
                <p className="w-16 sm:w-20 text-right text-foreground text-sm font-mono tabular-nums font-bold">
                  {formatCurrency(t.currentTotal)}
                </p>
                {t.isNew ? (
                  <p className="w-12 sm:w-16 text-right text-xs font-mono font-bold text-red-400">▲ NEW</p>
                ) : flat && t.currentTotal === 0 && t.lastMonthTotal === 0 ? (
                  <p className="w-12 sm:w-16 text-right text-xs font-mono font-bold text-muted-base">—</p>
                ) : (
                  <p className={`w-12 sm:w-16 text-right text-xs font-mono font-bold ${
                    flat ? "text-muted-base" : up ? "text-red-400" : "text-green-400"
                  }`}>
                    {flat ? "—" : `${up ? "▲" : "▼"} ${Math.abs(t.deltaPct)}%`}
                  </p>
                )}
                {/* Sparkline only shows on >=sm; mobile drops it for space */}
                <div className="hidden sm:flex w-24 justify-end">
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
