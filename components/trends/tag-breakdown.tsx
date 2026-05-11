"use client";
import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import type { TagBreakdownRow } from "@/lib/actions/trends";

interface Props {
  tags: TagBreakdownRow[];
}

export function TagBreakdown({ tags }: Props) {
  const [expanded, setExpanded] = useState(false);
  if (tags.length === 0) {
    return <p className="text-muted-base text-sm text-center py-8">No tagged expenses this month.</p>;
  }
  const visible = expanded ? tags : tags.slice(0, 5);
  return (
    <div className="rounded-2xl bg-white/[0.03] border border-accent-purple/10 divide-y divide-white/5">
      {visible.map((t) => (
        <div key={`${t.tagId}-${t.name}`} className="p-4 flex items-center gap-3">
          <span className="text-lg">{t.emoji}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-foreground font-medium truncate">{t.name}</p>
              <p className="text-amber-400 text-sm font-bold shrink-0">{formatCurrency(t.total)}</p>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div className="h-full rounded-full bg-gradient-brand" style={{ width: `${t.pct}%` }} />
            </div>
            <p className="text-muted-base text-[10px] mt-0.5">{t.pct}%</p>
          </div>
        </div>
      ))}
      {tags.length > 5 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="w-full p-3 text-xs text-accent-purple-light hover:text-foreground"
        >
          {expanded ? "Show less" : `Show all ${tags.length}`}
        </button>
      )}
    </div>
  );
}
