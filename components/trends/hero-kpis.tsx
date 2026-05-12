import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

interface Props {
  spent: number;
  income: number;
  savings: number;          // income - spent (clamped at 0)
  targetSpendPct: number;   // billsPct + wantsPct
}

function Chip({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "good" | "bad" }) {
  const toneClass = tone === "good" ? "text-green-400" : tone === "bad" ? "text-red-400" : "text-foreground";
  return (
    <div className="rounded-2xl bg-white/[0.03] border border-accent-purple/10 p-4">
      <p className="text-muted-base text-[9px] uppercase tracking-widest font-semibold">{label}</p>
      <p className={`text-lg font-black ${toneClass} mt-1`}>{value}</p>
      {sub && <p className="text-muted-base text-[10px] mt-0.5">{sub}</p>}
    </div>
  );
}

export function HeroKpis({ spent, income, savings, targetSpendPct }: Props) {
  const target = income * (targetSpendPct / 100);
  const delta = spent - target;

  let budgetChip;
  if (income === 0) {
    budgetChip = (
      <div className="rounded-2xl bg-white/[0.03] border border-accent-purple/10 p-4">
        <p className="text-muted-base text-[9px] uppercase tracking-widest font-semibold">Budget</p>
        <Link href="/income" className="text-sm text-accent-gold underline mt-1 block">Set income</Link>
      </div>
    );
  } else if (delta <= 0) {
    budgetChip = <Chip label="Budget" value={formatCurrency(Math.abs(delta))} sub="left to spend" tone="good" />;
  } else {
    budgetChip = <Chip label="Budget" value={formatCurrency(delta)} sub="over budget" tone="bad" />;
  }

  const savedPct = income > 0 ? Math.round((savings / income) * 100) : 0;
  return (
    <div className="grid grid-cols-3 gap-3">
      <Chip label="Spent" value={formatCurrency(spent)} sub="this month" />
      {budgetChip}
      <Chip label="Saved" value={formatCurrency(savings)} sub={income > 0 ? `${savedPct}% of income` : "—"} tone="good" />
    </div>
  );
}
