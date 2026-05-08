import { formatCurrency } from "@/lib/utils";

interface HeroCardProps {
  budgetTotal: number;
  actualBalance: number;
  possible: number;
  openingBalance: number;
  totalExpenses: number;
}

export function HeroCard({ budgetTotal, actualBalance, possible, openingBalance, totalExpenses }: HeroCardProps) {
  const closingBalance = openingBalance + actualBalance - totalExpenses;
  const pctUsed = budgetTotal > 0 ? Math.min((totalExpenses / budgetTotal) * 100, 100) : 0;
  const onTrack = pctUsed < 85;

  return (
    <div className="rounded-2xl bg-gradient-card border border-accent-gold/25 p-5">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-accent-purple-light text-[10px] uppercase tracking-widest mb-1">Budget Total</p>
          <p className="gradient-text text-4xl font-black">{formatCurrency(budgetTotal)}</p>
          <p className="text-muted-base text-xs mt-1">
            Actual: {formatCurrency(actualBalance)}
            {possible > 0 && <span className="ml-2 text-muted-base/60">+{formatCurrency(possible)} possible</span>}
          </p>
          <p className="text-muted-base text-xs">
            Opening: {formatCurrency(openingBalance)} · Closing: {formatCurrency(closingBalance)}
          </p>
        </div>
        <div className="text-right">
          <span className={`text-[10px] px-3 py-1 rounded-full font-semibold ${
            onTrack
              ? "bg-green-500/15 text-green-400 border border-green-500/30"
              : "bg-red-500/15 text-red-400 border border-red-500/30"
          }`}>
            {onTrack ? "✓ On track" : "⚠ Over budget"}
          </span>
          <p className="text-foreground text-xl font-bold mt-2">{formatCurrency(closingBalance)}</p>
          <p className="text-muted-base text-[10px]">Cash left</p>
        </div>
      </div>
      <div className="mt-4">
        <div className="flex justify-between text-[10px] text-muted-base mb-1">
          <span>Spent: {formatCurrency(totalExpenses)}</span>
          <span>{pctUsed.toFixed(0)}% of budget</span>
        </div>
        <div className="h-2 rounded-full bg-white/[0.08] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-brand transition-all"
            style={{ width: `${pctUsed}%` }}
          />
        </div>
      </div>
    </div>
  );
}
