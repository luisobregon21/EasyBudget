"use client";

import { useState, useTransition } from "react";
import { Plus, X, Check } from "lucide-react";
import { toast } from "sonner";
import { setTripBudgetLine, clearTripBudgetLine } from "@/lib/actions/trips";
import { formatCurrency } from "@/lib/utils";

interface BudgetLine {
  id: number;
  tagId: number;
  pct: number;
  tagName: string;
  tagEmoji: string | null;
}

interface TagOption {
  id: number;
  name: string;
  emoji: string | null;
}

interface Props {
  tripId: number;
  /** Trip-spendable = Available − savings hold (USD). Used to derive dollar amounts from %. */
  tripSpendable: number;
  savingsHold: number;
  savingsPct: number;
  /** Existing budget lines, joined with tag display data */
  lines: BudgetLine[];
  /** Every tag the user has (existing + newly-seeded) for the picker */
  allTags: TagOption[];
  /** Per-tag actual spend within the trip (USD-normalized) */
  spentByTag: Record<number, number>;
}

export function TripBudgetEditor({
  tripId,
  tripSpendable,
  savingsHold,
  savingsPct,
  lines,
  allTags,
  spentByTag,
}: Props) {
  const [adding, setAdding] = useState(false);
  const [editingTagId, setEditingTagId] = useState<number | null>(null);
  const [editPct, setEditPct] = useState<string>("");
  const [pending, startTransition] = useTransition();

  const budgetedTagIds = new Set(lines.map((l) => l.tagId));
  const unbudgetedTags = allTags
    .filter((t) => !budgetedTagIds.has(t.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  const totalPct = lines.reduce((s, l) => s + l.pct, 0);
  const totalAllocated = (totalPct / 100) * tripSpendable;
  const unallocatedDollars = tripSpendable - totalAllocated;
  const isOver = totalPct > 100;

  function commitPct(tagId: number, raw: string) {
    const pct = Math.max(0, Math.min(100, parseFloat(raw) || 0));
    startTransition(async () => {
      const result = await setTripBudgetLine(tripId, tagId, pct);
      if (result.success) {
        toast.success(result.message);
        setEditingTagId(null);
      } else {
        toast.error(result.message);
      }
    });
  }

  function removeLine(tagId: number) {
    startTransition(async () => {
      const result = await clearTripBudgetLine(tripId, tagId);
      if (result.success) toast.success(result.message);
      else toast.error(result.message);
    });
  }

  function addTag(tag: TagOption) {
    // Default new lines to whatever's unallocated, but not over 100.
    const suggested = Math.max(0, Math.min(100 - totalPct, 10));
    startTransition(async () => {
      const result = await setTripBudgetLine(tripId, tag.id, suggested);
      if (result.success) {
        toast.success(`${tag.name} budgeted at ${suggested}%`);
        setAdding(false);
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="rounded-2xl bg-white/[0.03] border border-accent-purple/10 p-5 space-y-4">
      {/* Header */}
      <div className="flex justify-between items-start gap-3">
        <div>
          <p className="text-muted-base text-[10px] uppercase tracking-widest mb-1">Trip spendable</p>
          <p className="gradient-text text-2xl font-black tracking-tight">{formatCurrency(tripSpendable)}</p>
          {savingsHold > 0 && (
            <p className="text-muted-base text-[10px] mt-0.5">
              {formatCurrency(savingsHold)} held as savings ({savingsPct}%)
            </p>
          )}
        </div>
        <div className="text-right">
          <p className={`text-xs font-bold ${isOver ? "text-red-400" : "text-foreground"}`}>
            {totalPct}% allocated
          </p>
          {unallocatedDollars > 0 && totalPct < 100 && (
            <p className="text-muted-base text-[10px]">
              {formatCurrency(unallocatedDollars)} unallocated
            </p>
          )}
          {isOver && (
            <p className="text-red-400 text-[10px]">
              {formatCurrency(Math.abs(unallocatedDollars))} over
            </p>
          )}
        </div>
      </div>

      {/* Budget lines */}
      {lines.length === 0 && !adding && (
        <p className="text-muted-base text-xs text-center py-3">
          No categories budgeted yet. Add one below to start planning.
        </p>
      )}

      <div className="space-y-2">
        {lines.map((line) => {
          const dollars = (line.pct / 100) * tripSpendable;
          const spent = spentByTag[line.tagId] ?? 0;
          const fillPct = dollars > 0 ? Math.min((spent / dollars) * 100, 100) : 0;
          const overBudget = spent > dollars;
          const isEditing = editingTagId === line.tagId;
          return (
            <div key={line.id} className="rounded-xl bg-bg-deep border border-accent-purple/13 p-3">
              <div className="flex items-center gap-3">
                <span className="text-lg shrink-0 w-6 text-center">{line.tagEmoji ?? "📦"}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-foreground text-sm truncate">{line.tagName}</p>
                    <p className={`text-xs font-mono tabular-nums shrink-0 ${overBudget ? "text-red-400" : "text-muted-base"}`}>
                      {formatCurrency(spent)} / {formatCurrency(dollars)}
                    </p>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/[0.06] mt-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${fillPct}%`,
                        background: overBudget ? "#f87171" : "linear-gradient(90deg, #fbbf24, #ec4899)",
                      }}
                    />
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-1">
                  {isEditing ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        commitPct(line.tagId, editPct);
                      }}
                      className="flex items-center gap-1"
                    >
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={editPct}
                        onChange={(e) => setEditPct(e.target.value)}
                        autoFocus
                        disabled={pending}
                        className="w-14 bg-bg-deep border border-accent-purple/30 text-foreground rounded text-xs px-1.5 py-1 text-right"
                      />
                      <span className="text-muted-base text-[10px]">%</span>
                      <button
                        type="submit"
                        disabled={pending}
                        className="p-1 text-emerald-400 hover:text-emerald-300 disabled:opacity-50"
                        aria-label="Save"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingTagId(null)}
                        disabled={pending}
                        className="p-1 text-muted-base hover:text-foreground disabled:opacity-50"
                        aria-label="Cancel"
                      >
                        <X size={14} />
                      </button>
                    </form>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => { setEditingTagId(line.tagId); setEditPct(String(line.pct)); }}
                        className="text-xs font-semibold text-accent-purple-light hover:text-foreground px-2 py-1 rounded bg-accent-purple/10"
                      >
                        {line.pct}%
                      </button>
                      <button
                        type="button"
                        onClick={() => removeLine(line.tagId)}
                        disabled={pending}
                        className="p-1 text-muted-base hover:text-red-400 disabled:opacity-50"
                        aria-label={`Remove ${line.tagName}`}
                      >
                        <X size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add a category */}
      {adding ? (
        <div className="rounded-xl bg-bg-deep border border-accent-purple/30 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-foreground text-xs font-semibold">Pick a category</p>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="text-muted-base hover:text-foreground"
              aria-label="Cancel"
            >
              <X size={14} />
            </button>
          </div>
          {unbudgetedTags.length === 0 ? (
            <p className="text-muted-base text-xs text-center py-2">Every category is already budgeted.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto">
              {unbudgetedTags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => addTag(tag)}
                  disabled={pending}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-accent-purple/20 text-foreground text-xs hover:border-accent-purple/40 disabled:opacity-50 transition-colors"
                >
                  <span>{tag.emoji ?? "📦"}</span>
                  <span>{tag.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-dashed border-accent-purple/30 text-muted-base hover:text-foreground hover:border-accent-purple/50 transition-colors text-xs"
        >
          <Plus size={14} />
          Add category
        </button>
      )}
    </div>
  );
}
