"use client";
import { motion, useReducedMotion } from "motion/react";
import { formatCurrency } from "@/lib/utils";
import type { BucketBreakdownRow } from "@/lib/actions/trends";

const STYLES: Record<BucketBreakdownRow["bucket"], { label: string; emoji: string; gradient: string }> = {
  savings: { label: "Savings",  emoji: "💰", gradient: "from-amber-400 to-pink-500" },
  bills:   { label: "Bills",    emoji: "🏦", gradient: "from-pink-500 to-pink-400" },
  wants:   { label: "Personal", emoji: "✨", gradient: "from-violet-500 to-violet-400" },
};

interface Props {
  buckets: BucketBreakdownRow[];
}

export function BucketPulseBars({ buckets }: Props) {
  const reduced = useReducedMotion();

  if (buckets.length === 0 || buckets.every((b) => b.spent === 0 && b.allocated === 0)) {
    return <p className="text-muted-base text-sm text-center py-8">Set income to enable budget tracking.</p>;
  }

  return (
    <div className="rounded-2xl bg-white/[0.03] border border-accent-purple/10 divide-y divide-white/5">
      {buckets.map((b) => {
        const s = STYLES[b.bucket];
        const over = b.pct > 100;
        const fill = Math.min(b.pct, 100);
        const gradient = over ? "from-red-500 to-red-400" : s.gradient;
        return (
          <div key={b.bucket} className="p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-foreground font-semibold text-sm">
                <span>{s.emoji}</span>{s.label}
              </span>
              <span className={`text-xs font-bold ${over ? "text-red-400" : "text-foreground"}`}>
                {formatCurrency(b.spent)} / {formatCurrency(b.allocated)}
              </span>
            </div>
            <div className="relative h-2.5 rounded-full bg-white/[0.08]">
              <motion.div
                className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${gradient}`}
                initial={reduced ? { width: `${fill}%` } : { width: 0, opacity: 0.85 }}
                animate={
                  reduced
                    ? { width: `${fill}%` }
                    : {
                        width: `${fill}%`,
                        opacity: [0.85, 1, 0.85],
                        boxShadow: [
                          "0 0 4px 0 rgba(236, 72, 153, 0.4)",
                          "0 0 18px 3px rgba(236, 72, 153, 0.85)",
                          "0 0 4px 0 rgba(236, 72, 153, 0.4)",
                        ],
                      }
                }
                transition={{
                  width: { duration: 0.8, ease: "easeOut" },
                  opacity: { duration: 1.8, repeat: Infinity, ease: "easeInOut" },
                  boxShadow: { duration: 1.8, repeat: Infinity, ease: "easeInOut" },
                }}
              />
            </div>
            <p className="text-muted-base text-[10px] text-right">{b.pct}% used</p>
          </div>
        );
      })}
    </div>
  );
}
