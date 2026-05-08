import { formatCurrency } from "@/lib/utils";

type Bucket = "savings" | "bills" | "wants";

const STYLES: Record<Bucket, { bg: string; border: string; label: string; bar: string; icon: string; displayName: string }> = {
  savings: { bg: "bg-amber-500/10",  border: "border-amber-500/25",  label: "text-amber-400",  bar: "bg-amber-400",  icon: "💰", displayName: "Savings" },
  bills:   { bg: "bg-pink-500/10",   border: "border-pink-500/25",   label: "text-pink-400",   bar: "bg-pink-400",   icon: "🏦", displayName: "Bills" },
  wants:   { bg: "bg-violet-500/10", border: "border-violet-500/25", label: "text-violet-400", bar: "bg-violet-400", icon: "✨", displayName: "Personal" },
};

interface AllocationCardProps {
  bucket: Bucket;
  pct: number;
  income: number;
  spent: number;
}

export function AllocationCard({ bucket, pct, income, spent }: AllocationCardProps) {
  const allocated = income * (pct / 100);
  const remaining = allocated - spent;
  const fill = allocated > 0 ? Math.min((spent / allocated) * 100, 100) : 0;
  const s = STYLES[bucket];

  return (
    <div className={`rounded-2xl ${s.bg} border ${s.border} p-4`}>
      <div className="flex justify-between items-center mb-2">
        <span className="text-xl">{s.icon}</span>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${s.label} ${s.bg} border ${s.border}`}>
          {pct}% target
        </span>
      </div>
      <p className={`text-[10px] uppercase tracking-wider ${s.label} mb-1`}>{s.displayName}</p>
      <p className="text-foreground text-xl font-bold">{formatCurrency(allocated)}</p>
      <p className="text-muted-base text-[10px] mt-0.5">
        {formatCurrency(spent)} spent · {formatCurrency(Math.max(remaining, 0))} left
      </p>
      <div className="h-1 rounded-full bg-white/[0.08] mt-3 overflow-hidden">
        <div className={`h-full rounded-full ${s.bar}`} style={{ width: `${fill}%` }} />
      </div>
    </div>
  );
}
