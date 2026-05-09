"use client";
import { useState, useActionState, useEffect } from "react";
import { deleteSavingsAllocation, createSavingsAllocation } from "@/lib/actions/goals";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FireAndForgetButton } from "@/components/ui/fire-and-forget-button";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

type Allocation = { id: number; name: string; percentage: number };

export function SavingsAllocationList({
  allocations,
  savingsPot,
}: {
  allocations: Allocation[];
  savingsPot: number;
}) {
  const totalPct = allocations.reduce((s, a) => s + a.percentage, 0);
  const remaining = 100 - totalPct;

  const [formKey, setFormKey] = useState(0);
  const [state, formAction, pending] = useActionState(createSavingsAllocation, null);

  useEffect(() => {
    if (state?.success) {
      toast.success(state.message);
      setFormKey((k) => k + 1);  // reset form
    }
    if (state?.success === false) toast.error(state.message);
  }, [state]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-foreground font-semibold">Savings Allocation</h3>
        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
          totalPct === 100 ? "bg-green-500/15 text-green-400" :
          totalPct < 100  ? "bg-amber-500/15 text-amber-400" :
                            "bg-red-500/15 text-red-400"
        }`}>
          {totalPct}% allocated{totalPct < 100 ? ` · ${remaining}% unassigned` : ""}
        </span>
      </div>

      <div className="rounded-2xl bg-white/[0.03] border border-accent-purple/10 divide-y divide-white/5">
        {allocations.length === 0 && (
          <p className="text-muted-base text-sm text-center py-6">No allocations yet. Add a destination.</p>
        )}
        {allocations.map((a) => {
          const dollars = savingsPot * (a.percentage / 100);
          return (
            <div key={a.id} className="flex items-center justify-between p-4 gap-3">
              <div className="min-w-0">
                <p className="text-foreground font-medium truncate">{a.name}</p>
                <p className="text-muted-base text-xs">{formatCurrency(dollars)} this month</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-accent-purple-light font-bold">{a.percentage}%</span>
                <FireAndForgetButton
                  action={() => deleteSavingsAllocation(a.id)}
                  className="text-muted-base hover:text-red-400 transition-colors"
                >
                  <Trash2 size={14} />
                </FireAndForgetButton>
              </div>
            </div>
          );
        })}
      </div>

      <form key={formKey} action={formAction}
        className="rounded-2xl bg-white/[0.03] border border-accent-purple/10 p-4 space-y-3">
        <p className="text-muted-base text-xs uppercase tracking-widest">Add Destination</p>
        <div className="flex gap-3">
          <div className="flex-1 space-y-1">
            <Label className="text-muted-base text-[10px] uppercase tracking-widest">Name</Label>
            <Input name="name" required placeholder="Roth IRA"
              className="bg-bg-deep border-accent-purple/20 text-foreground" />
          </div>
          <div className="w-24 space-y-1">
            <Label className="text-muted-base text-[10px] uppercase tracking-widest">%</Label>
            <Input name="percentage" type="number" min="1" max="100" required placeholder="50"
              className="bg-bg-deep border-accent-purple/20 text-foreground" />
          </div>
        </div>
        {state && !state.success && (
          <p className="text-sm text-red-400">{state.message}</p>
        )}
        <Button type="submit" disabled={pending} className="w-full bg-gradient-brand text-white font-bold">
          {pending ? "Saving…" : "Add Destination"}
        </Button>
      </form>
    </div>
  );
}
