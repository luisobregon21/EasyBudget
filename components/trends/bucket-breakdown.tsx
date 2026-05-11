import { formatCurrency } from "@/lib/utils";
import type { BucketBreakdownRow } from "@/lib/actions/trends";

const STYLES: Record<BucketBreakdownRow["bucket"], { label: string; bar: string; icon: string }> = {
  savings: { label: "Savings",  bar: "from-amber-400 to-amber-500",   icon: "💰" },
  bills:   { label: "Bills",    bar: "from-pink-500 to-pink-400",     icon: "🏦" },
  wants:   { label: "Personal", bar: "from-violet-500 to-violet-400", icon: "✨" },
};

interface Props {
  buckets: BucketBreakdownRow[];
}

export function BucketBreakdown({ buckets }: Props) {
  if (buckets.length === 0 || buckets.every((b) => b.spent === 0 && b.allocated === 0)) {
    return <p className="text-muted-base text-sm text-center py-8">No budget set this month.</p>;
  }
  return (
    <div className="rounded-2xl bg-white/[0.03] border border-accent-purple/10 divide-y divide-white/5">
      {buckets.map((b) => {
        const s = STYLES[b.bucket];
        const fill = Math.min(b.pct, 100);
        const over = b.pct > 100;
        return (
          <div key={b.bucket} className="p-4 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-foreground font-semibold">
                <span>{s.icon}</span>{s.label}
              </span>
              <span className={`text-xs font-bold ${over ? "text-red-400" : "text-foreground"}`}>
                {formatCurrency(b.spent)} / {formatCurrency(b.allocated)}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${over ? "from-red-500 to-red-400" : s.bar}`}
                style={{ width: `${fill}%` }}
              />
            </div>
            <p className="text-muted-base text-[10px] text-right">{b.pct}% used</p>
          </div>
        );
      })}
    </div>
  );
}
