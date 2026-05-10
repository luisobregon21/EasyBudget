import { formatCurrency } from "@/lib/utils";

type Bucket = "savings" | "bills" | "wants";

const STYLES: Record<Bucket, {
  bg: string; border: string; label: string; bar: string; icon: string; displayName: string;
}> = {
  savings: { bg: "bg-amber-500/[0.08]",  border: "border-amber-500/25",  label: "text-amber-400",  bar: "from-amber-400 to-amber-500",  icon: "💰", displayName: "Savings"  },
  bills:   { bg: "bg-pink-500/[0.08]",   border: "border-pink-500/25",   label: "text-pink-400",   bar: "from-pink-500 to-pink-400",    icon: "🏦", displayName: "Bills"    },
  wants:   { bg: "bg-violet-500/[0.08]", border: "border-violet-500/25", label: "text-violet-400", bar: "from-violet-500 to-violet-400", icon: "✨", displayName: "Personal" },
};

interface AllocationCardProps {
  bucket: Bucket;
  pct: number;
  income: number;
  spent: number;
}

export function AllocationCard({ bucket, pct, income, spent }: AllocationCardProps) {
  const allocated  = income * (pct / 100);
  const remaining  = allocated - spent;
  const fill       = allocated > 0 ? Math.min((spent / allocated) * 100, 100) : 0;
  const overBudget = remaining < 0;
  const s = STYLES[bucket];

  return (
    <div className={`rounded-2xl ${s.bg} border ${s.border} p-4 flex flex-col gap-3`}>
      {/* header */}
      <div className="flex justify-between items-center">
        <span className="text-xl">{s.icon}</span>
        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${s.label} ${s.bg} border ${s.border}`}>
          {pct}% target
        </span>
      </div>

      {/* bucket name + budgeted */}
      <div>
        <p className={`text-[9px] uppercase tracking-widest font-semibold ${s.label} mb-0.5`}>{s.displayName}</p>
        <p className="text-foreground text-lg font-black">{formatCurrency(allocated)}</p>
        <p className="text-muted-base text-[9px]">budgeted this month</p>
      </div>

      {/* spent / remaining */}
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-muted-base text-[10px]">Spent</span>
          <span className="text-foreground text-[10px] font-semibold">{formatCurrency(spent)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-base text-[10px]">Remaining</span>
          <span className={`text-[10px] font-bold ${overBudget ? "text-red-400" : "text-green-400"}`}>
            {overBudget ? `-${formatCurrency(Math.abs(remaining))}` : formatCurrency(remaining)}
          </span>
        </div>
      </div>

      {/* progress bar */}
      <div>
        <div className="h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${overBudget ? "from-red-500 to-red-400" : s.bar}`}
            style={{ width: `${fill}%` }}
          />
        </div>
        <p className="text-muted-base text-[9px] mt-1 text-right">{Math.round(fill)}% used</p>
      </div>
    </div>
  );
}
