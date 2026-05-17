"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { TopActionChips } from "./top-action-chips";

interface Props {
  title: string;
  sub?: string;
  kicker?: string;        // default "easyBudget"
  monthLabel?: string;    // "May 2026"
  onPrevMonth?: () => void;
  onNextMonth?: () => void;
}

export function TopBar({ title, sub, kicker = "easyBudget", monthLabel, onPrevMonth, onNextMonth }: Props) {
  return (
    <header className="flex items-start justify-between gap-3 px-4 md:px-8 pt-[max(1rem,env(safe-area-inset-top))] pb-3">
      <div className="min-w-0">
        <p className="text-[9px] font-bold tracking-[0.15em] uppercase text-muted-base">{kicker}</p>
        <h1 className="text-xl font-bold text-foreground tracking-tight">{title}</h1>
        {sub && <p className="text-xs text-muted-base mt-0.5">{sub}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {monthLabel && (
          <div className="flex items-center gap-1 bg-white/[0.025] border border-accent-purple/13 rounded-full px-2.5 py-1.5">
            <button onClick={onPrevMonth} aria-label="Previous month" className="text-muted-base"><ChevronLeft size={13} /></button>
            <span className="text-[11px] font-semibold text-foreground font-mono">{monthLabel}</span>
            <button onClick={onNextMonth} aria-label="Next month" className="text-muted-base"><ChevronRight size={13} /></button>
          </div>
        )}
        <TopActionChips />
      </div>
    </header>
  );
}
