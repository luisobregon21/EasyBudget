import { formatCurrency } from "@/lib/utils";
import { Sparkline } from "./sparkline";

interface Props {
  monthLabel: string;
  lastMonthLabel: string;
  spent: number;
  lastMonthSpent: number;
  sparkline: number[];
}

export function SpendTickerCard({ monthLabel, lastMonthLabel, spent, lastMonthSpent, sparkline }: Props) {
  const delta = spent - lastMonthSpent;
  const deltaPct = lastMonthSpent > 0 ? Math.round((delta / lastMonthSpent) * 100) : 0;
  const up = delta > 0;
  return (
    <section className="rounded-2xl bg-white/[0.03] border border-accent-purple/10 p-5 overflow-hidden">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-muted-base text-[10px] uppercase tracking-widest font-semibold">SPEND • {monthLabel}</p>
          <p className="text-foreground text-3xl font-black mt-1 font-mono tabular-nums">{formatCurrency(spent)}</p>
          {lastMonthSpent > 0 && (
            <p className={`text-xs font-bold font-mono mt-1.5 ${up ? "text-red-400" : "text-green-400"}`}>
              {up ? "▲" : "▼"} {formatCurrency(Math.abs(delta))} ({deltaPct > 0 ? "+" : ""}{deltaPct}%)
              <span className="text-muted-base font-normal ml-2">vs {lastMonthLabel}</span>
            </p>
          )}
        </div>
        <div className="w-40 shrink-0">
          <Sparkline values={sparkline} up={up} width={160} height={72} thick />
        </div>
      </div>
    </section>
  );
}
