"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Pencil, X, Check } from "lucide-react";
import { setTripCategoryBudget } from "@/lib/actions/trips";
import { formatCurrency } from "@/lib/utils";
import type { TripCategory } from "@/lib/trip-categories";

interface CategoryRow {
  category: TripCategory;
  label: string;
  emoji: string;
  color: string;
  budget: number;
  spent: number;
}

interface Props {
  tripId: number;
  tripSpendable: number;
  categories: CategoryRow[];
  totalBudgeted: number;
}

export function TripCategoryBudgets({ tripId, tripSpendable, categories, totalBudgeted }: Props) {
  const unallocated = Math.round((tripSpendable - totalBudgeted) * 100) / 100;
  const overAllocated = totalBudgeted > tripSpendable && tripSpendable > 0;

  return (
    <div className="rounded-2xl bg-white/[0.03] border border-accent-purple/10 p-5 space-y-3">
      <div className="flex items-baseline justify-between">
        <p className="text-muted-base text-[10px] uppercase tracking-widest">
          Trip Categories
        </p>
        <p className="text-muted-base text-[10px] font-mono tabular-nums">
          {formatCurrency(totalBudgeted)} / {formatCurrency(tripSpendable)}
        </p>
      </div>

      <div className="divide-y divide-white/5">
        {categories.map((c) => (
          <CategoryRowComponent key={c.category} tripId={tripId} row={c} />
        ))}
      </div>

      <p
        className={`text-[10px] font-mono text-right pt-1 ${
          overAllocated ? "text-red-400 font-semibold" : "text-muted-base"
        }`}
      >
        {overAllocated
          ? `${formatCurrency(totalBudgeted - tripSpendable)} over budget`
          : `${formatCurrency(unallocated)} unallocated`}
      </p>
    </div>
  );
}

function CategoryRowComponent({ tripId, row }: { tripId: number; row: CategoryRow }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(row.budget > 0 ? row.budget.toString() : "");
  const [pending, startTransition] = useTransition();

  const hasBudget = row.budget > 0;
  const fillPct = hasBudget ? Math.min((row.spent / row.budget) * 100, 100) : 0;
  const over = row.spent > row.budget && hasBudget;

  function save() {
    const amount = parseFloat(value);
    if (value !== "" && (!Number.isFinite(amount) || amount < 0)) {
      toast.error("Enter a valid amount");
      return;
    }
    const finalAmount = value === "" ? 0 : amount;
    startTransition(async () => {
      const result = await setTripCategoryBudget(tripId, row.category, finalAmount);
      if (result.success) {
        toast.success(finalAmount === 0 ? "Cleared" : "Budget updated");
        setEditing(false);
      } else {
        toast.error(result.message);
      }
    });
  }

  function cancel() {
    setEditing(false);
    setValue(row.budget > 0 ? row.budget.toString() : "");
  }

  return (
    <div className="py-3 space-y-2">
      <div className="flex items-center gap-3">
        <span className="text-xl shrink-0">{row.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-foreground text-sm font-semibold">{row.label}</p>
          {editing ? (
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-muted-base text-xs">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") save();
                  if (e.key === "Escape") cancel();
                }}
                placeholder="0"
                autoFocus
                className="flex-1 bg-bg-deep border border-accent-purple/20 text-foreground text-xs rounded-md px-2 py-1 max-w-[100px]"
              />
              <button
                type="button"
                onClick={save}
                disabled={pending}
                className="p-1 text-emerald-400 hover:text-emerald-300 disabled:opacity-50"
                aria-label="Save"
              >
                <Check size={14} />
              </button>
              <button
                type="button"
                onClick={cancel}
                disabled={pending}
                className="p-1 text-muted-base hover:text-foreground"
                aria-label="Cancel"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="flex items-baseline gap-1.5 mt-0.5 font-mono tabular-nums">
              <span className={`text-xs font-bold ${over ? "text-red-400" : "text-foreground"}`}>
                {formatCurrency(row.spent)}
              </span>
              <span className="text-muted-base text-[10px]">
                / {hasBudget ? formatCurrency(row.budget) : "—"}
              </span>
            </div>
          )}
        </div>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-muted-base hover:text-foreground transition-colors p-1 shrink-0"
            aria-label={`Edit ${row.label} budget`}
          >
            <Pencil size={13} />
          </button>
        )}
      </div>

      {hasBudget && !editing && (
        <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${fillPct}%`,
              background: over ? "#f87171" : row.color,
            }}
          />
        </div>
      )}
    </div>
  );
}
