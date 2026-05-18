import { formatCurrency, roundMoney } from "@/lib/utils";
import { utilizationBandFor, type UtilizationBand } from "@/lib/credit-utilization";
import type { CardWithBalance } from "@/lib/actions/card-payments";

interface Props {
  creditCards: CardWithBalance[];
}

const BAND_META: Record<UtilizationBand, { label: string; cls: string; bar: string }> = {
  excellent: { label: "Excellent",  cls: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25",  bar: "bg-emerald-400" },
  good:      { label: "Good",       cls: "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20", bar: "bg-emerald-300" },
  moderate:  { label: "Moderate",   cls: "bg-amber-500/15  text-amber-300  border border-amber-500/25",    bar: "bg-amber-400"   },
  high:      { label: "High",       cls: "bg-orange-500/15 text-orange-400 border border-orange-500/25",   bar: "bg-orange-400"  },
  very_high: { label: "Very High",  cls: "bg-red-500/20    text-red-400    border border-red-500/30",      bar: "bg-red-500"     },
};

export function OverallUtilizationCard({ creditCards }: Props) {
  const cardsWithLimit = creditCards.filter(
    (c) => c.creditLimit != null && c.creditLimit > 0,
  );

  // If no card has a limit set we can't compute overall — render a gentle nudge instead.
  if (cardsWithLimit.length === 0) {
    return (
      <div className="rounded-2xl bg-white/[0.03] border border-accent-purple/10 p-4">
        <p className="text-[9px] font-bold tracking-[0.15em] uppercase text-muted-base mb-1">
          Overall utilization
        </p>
        <p className="text-foreground text-sm">
          Add credit limits in <span className="text-accent-purple-light">Settings</span> to see your overall utilization.
        </p>
      </div>
    );
  }

  const totalBalance = roundMoney(cardsWithLimit.reduce((s, c) => s + Math.max(0, c.balance), 0));
  const totalLimit   = roundMoney(cardsWithLimit.reduce((s, c) => s + (c.creditLimit ?? 0), 0));
  const pct = Math.max(0, Math.round((totalBalance / totalLimit) * 100));
  const band = utilizationBandFor(pct);
  const meta = BAND_META[band];
  const barPct = Math.min(100, pct);
  const available = roundMoney(Math.max(0, totalLimit - totalBalance));

  // If some cards lack a limit, surface that so the user knows the number is partial
  const missingCount = creditCards.length - cardsWithLimit.length;

  return (
    <div className="relative rounded-2xl bg-card border border-cardEdge overflow-hidden">
      <div
        className="pointer-events-none absolute -top-16 -right-16 w-48 h-48 rounded-full opacity-10"
        style={{ background: "radial-gradient(circle, #a78bfa 0%, transparent 70%)" }}
      />
      <div className="relative p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[9px] font-bold tracking-[0.15em] uppercase text-muted-base">
              Overall utilization
            </p>
            <p className="text-foreground text-xs mt-0.5">
              Across {cardsWithLimit.length} card{cardsWithLimit.length === 1 ? "" : "s"}
              {missingCount > 0 && (
                <span className="text-muted-base"> · {missingCount} without limit</span>
              )}
            </p>
          </div>
          <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${meta.cls}`}>
            {pct}% · {meta.label}
          </span>
        </div>

        <div>
          <p className="gradient-text text-3xl font-black tracking-tight">
            {formatCurrency(totalBalance)}
          </p>
          <p className="text-[10px] text-muted-base mt-1">
            of {formatCurrency(totalLimit)} limit · {formatCurrency(available)} available
          </p>
        </div>

        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
          <div className={`h-full ${meta.bar} transition-all`} style={{ width: `${barPct}%` }} />
        </div>
      </div>
    </div>
  );
}
