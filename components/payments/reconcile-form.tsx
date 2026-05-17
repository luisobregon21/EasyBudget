"use client";
import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { reconcileCardBalance } from "@/lib/actions/card-payments";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { CardWithBalance } from "@/lib/actions/card-payments";

interface Props {
  card: CardWithBalance;
  onClose: () => void;
}

export function ReconcileForm({ card, onClose }: Props) {
  const [statementBalance, setStatementBalance] = useState("");
  const [isPending, startTransition] = useTransition();

  const parsed = parseFloat(statementBalance);
  const diff = isNaN(parsed) ? null : parsed - card.balance;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (diff === null) return;
    startTransition(async () => {
      const result = await reconcileCardBalance(card.id, parsed);
      if (result.success) {
        toast.success(result.message);
        onClose();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <>
      {/* backdrop */}
      <div className="fixed inset-0 bg-black/60 z-[60]" onClick={onClose} />

      {/* sheet */}
      <div className="fixed z-[70] bg-[#1e1235] border border-accent-purple/30 shadow-2xl
        bottom-0 inset-x-0 rounded-t-2xl border-t
        md:bottom-auto md:inset-x-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2
        md:w-full md:max-w-sm md:rounded-2xl">
        {/* drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 rounded-full bg-white/20" />
        </div>

        {/* header */}
        <div className="flex items-center justify-between px-5 py-3">
          <div>
            <p className="text-foreground font-bold text-base">Reconcile {card.name}</p>
            <p className="text-muted-base text-xs">Current balance: ${card.balance.toFixed(2)}</p>
          </div>
          <button type="button" onClick={onClose} className="text-muted-base hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 pb-8 space-y-4">
          {/* statement balance input */}
          <div className="space-y-1">
            <p className="text-muted-base text-[10px] uppercase tracking-widest">Statement balance</p>
            <Input
              type="number"
              step="0.01"
              min="0"
              required
              placeholder="0.00"
              value={statementBalance}
              onChange={(e) => setStatementBalance(e.target.value)}
              className="bg-bg-deep border-accent-purple/20 text-foreground text-xl font-bold"
            />
          </div>

          {/* live adjustment preview */}
          {diff !== null && Math.abs(diff) >= 0.01 && (
            <div className={`rounded-xl p-3 border ${diff > 0 ? "border-red-500/20 bg-red-500/5" : "border-emerald-500/20 bg-emerald-500/5"}`}>
              <p className="text-xs font-semibold">
                <span className="text-muted-base">Adjustment: </span>
                <span className={diff > 0 ? "text-red-400" : "text-emerald-400"}>
                  {diff > 0 ? "+" : "−"}${Math.abs(diff).toFixed(2)}
                </span>
                <span className="text-muted-base"> ({diff > 0 ? "balance up" : "balance down"})</span>
              </p>
            </div>
          )}

          {diff !== null && Math.abs(diff) < 0.01 && (
            <p className="text-emerald-400 text-xs text-center">Balance already matches — no adjustment needed.</p>
          )}

          <Button
            type="submit"
            disabled={isPending || diff === null || Math.abs(diff) < 0.01}
            className="w-full bg-gradient-to-br from-amber-400 to-pink-500 text-white font-bold py-3 rounded-xl text-base disabled:opacity-50"
          >
            {isPending ? "Reconciling…" : "Apply Adjustment"}
          </Button>
        </form>
      </div>
    </>
  );
}
