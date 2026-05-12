import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import type { TripBreakdownRow } from "@/lib/actions/trends";

interface Props {
  trips: TripBreakdownRow[];
}

export function TripsList({ trips }: Props) {
  if (trips.length === 0) {
    return <p className="text-muted-base text-sm text-center py-8">No trip spending this month.</p>;
  }
  return (
    <div className="rounded-2xl bg-white/[0.03] border border-accent-purple/10 divide-y divide-white/5">
      {trips.map((t) => {
        const pct  = t.budgetUsd && t.budgetUsd > 0 ? Math.round((t.spent / t.budgetUsd) * 100) : null;
        const over = pct !== null && pct > 100;
        const fill = pct !== null ? Math.min(pct, 100) : 0;
        return (
          <Link key={t.tripId} href={`/trips/${t.tripId}`} className="block p-4 hover:bg-white/[0.02]">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-foreground font-semibold text-sm">
                <span>✈️</span>{t.name}
              </span>
              <span className={`text-sm font-bold ${over ? "text-red-400" : "text-cyan-400"}`}>
                {formatCurrency(t.spent)}
                {t.budgetUsd ? <span className="text-muted-base font-normal"> / {formatCurrency(t.budgetUsd)}</span> : null}
              </span>
            </div>
            {pct !== null && (
              <>
                <div className="mt-2 h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${over ? "from-red-500 to-red-400" : "from-cyan-400 to-cyan-500"}`}
                    style={{ width: `${fill}%` }}
                  />
                </div>
                <p className="text-muted-base text-[10px] mt-0.5 text-right">{pct}%</p>
              </>
            )}
          </Link>
        );
      })}
    </div>
  );
}
