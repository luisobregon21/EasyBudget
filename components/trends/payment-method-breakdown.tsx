import { formatCurrency } from "@/lib/utils";

interface Row {
  key: string;
  name: string;
  total: number;
}

interface Props {
  rows: Row[];
  totalSpent: number;
}

export function PaymentMethodBreakdown({ rows, totalSpent }: Props) {
  if (rows.length === 0) {
    return <p className="text-muted-base text-sm text-center py-8">No payments recorded this month.</p>;
  }
  return (
    <div className="rounded-2xl bg-white/[0.03] border border-accent-purple/10 divide-y divide-white/5">
      {rows.map((m) => {
        const pct = totalSpent > 0 ? Math.round((m.total / totalSpent) * 100) : 0;
        return (
          <div key={m.key} className="flex items-center justify-between p-4 gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-foreground font-medium">{m.name}</p>
              <div className="mt-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                <div className="h-full rounded-full bg-gradient-brand" style={{ width: `${pct}%` }} />
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-amber-400 font-bold">{formatCurrency(m.total)}</p>
              <p className="text-muted-base text-xs">{pct}%</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
