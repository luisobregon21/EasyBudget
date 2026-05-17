import { formatCurrency } from "@/lib/utils";
import type { BucketComparison } from "@/lib/actions/trends";

const LABELS: Record<BucketComparison["bucket"], { name: string; color: string; emoji: string }> = {
  savings: { name: "Savings",  color: "#f59e0b", emoji: "💰" },
  bills:   { name: "Bills",    color: "#ec4899", emoji: "🏦" },
  wants:   { name: "Personal", color: "#a78bfa", emoji: "✨" },
};

interface Props {
  buckets: BucketComparison[];
  previousLabel: string;
}

export function CompareBucketRows({ buckets, previousLabel }: Props) {
  return (
    <div className="rounded-2xl bg-white/[0.03] border border-accent-purple/13 divide-y divide-white/5">
      {buckets.map((b) => {
        const meta = LABELS[b.bucket];
        const up = b.deltaPct > 0;
        const flat = b.deltaPct === 0 && b.current === b.previous;
        return (
          <div key={b.bucket} className="p-3 flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0"
              style={{ background: `${meta.color}1a`, color: meta.color }}
            >
              {meta.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-foreground text-sm font-medium">{meta.name}</p>
              <p className="text-muted-base text-[10px] font-mono">
                vs {previousLabel}: {formatCurrency(b.previous)}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-foreground font-mono text-sm font-bold tabular-nums">
                {formatCurrency(b.current)}
              </p>
              {!flat && (
                <p className={`text-[10px] font-mono font-bold ${up ? "text-red-400" : "text-emerald-400"}`}>
                  {up ? "▲" : "▼"} {Math.abs(b.deltaPct)}%
                </p>
              )}
              {flat && <p className="text-[10px] font-mono text-muted-base">—</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
