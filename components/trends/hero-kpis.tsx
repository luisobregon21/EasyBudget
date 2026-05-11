import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

interface Props {
  thisMonthSpent: number;
  lastMonthSpent: number;
  income: number;
  targetSpendPct: number;   // wantsPct + billsPct
}

function Chip({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "good" | "bad" }) {
  const toneClass =
    tone === "good" ? "text-green-400" :
    tone === "bad"  ? "text-red-400"   :
    "text-foreground";
  return (
    <div className="flex-1 rounded-2xl bg-white/[0.03] border border-accent-purple/10 p-4">
      <p className="text-muted-base text-[9px] uppercase tracking-widest font-semibold">{label}</p>
      <p className={`text-lg font-black ${toneClass} mt-1`}>{value}</p>
      {sub && <p className="text-muted-base text-[10px] mt-0.5">{sub}</p>}
    </div>
  );
}

export function HeroKpis({ thisMonthSpent, lastMonthSpent, income, targetSpendPct }: Props) {
  const target = income * (targetSpendPct / 100);
  const delta  = thisMonthSpent - target;

  let vsTargetChip;
  if (income === 0) {
    vsTargetChip = (
      <div className="flex-1 rounded-2xl bg-white/[0.03] border border-accent-purple/10 p-4">
        <p className="text-muted-base text-[9px] uppercase tracking-widest font-semibold">Budget</p>
        <Link href="/income" className="text-sm text-accent-gold underline mt-1 block">
          Set income to see target
        </Link>
      </div>
    );
  } else if (delta <= 0) {
    vsTargetChip = (
      <Chip
        label="Budget"
        value={formatCurrency(Math.abs(delta))}
        sub="left to spend"
        tone="good"
      />
    );
  } else {
    vsTargetChip = (
      <Chip
        label="Budget"
        value={formatCurrency(delta)}
        sub="over budget"
        tone="bad"
      />
    );
  }

  return (
    <div className="flex gap-3">
      <Chip label="This Month" value={formatCurrency(thisMonthSpent)} sub="spent" />
      <Chip label="Last Month" value={formatCurrency(lastMonthSpent)} sub="spent" />
      {vsTargetChip}
    </div>
  );
}
