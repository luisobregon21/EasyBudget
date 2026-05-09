"use client";
import { useActionState, useEffect, useState } from "react";
import { createIncomeEntry } from "@/lib/actions/income";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function IncomeForm({ monthId }: { monthId: number }) {
  const [frequency, setFrequency] = useState<"biweekly" | "monthly" | "one_time">("monthly");
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createIncomeEntry, null);

  useEffect(() => {
    if (state?.success) {
      toast.success(state.message);
      setOpen(false);
    }
    if (state?.success === false) toast.error(state.message);
  }, [state]);

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} className="w-full bg-gradient-brand text-white font-bold">
        + Add Income
      </Button>
    );
  }

  return (
    <form action={formAction} className="rounded-2xl bg-white/[0.03] border border-accent-purple/10 p-4 space-y-4">
      <p className="text-muted-base text-xs uppercase tracking-widest">Add Income</p>
      <input type="hidden" name="monthId" value={monthId} />

      <div className="space-y-1">
        <Label className="text-muted-base text-[10px] uppercase tracking-widest">Source Name</Label>
        <Input name="name" required placeholder="Employer X"
          className="bg-bg-deep border-accent-purple/20 text-foreground" />
      </div>

      <div className="space-y-1">
        <Label className="text-muted-base text-[10px] uppercase tracking-widest">Amount (USD)</Label>
        <Input name="amount" type="number" step="0.01" min="0" required placeholder="2000"
          className="bg-bg-deep border-accent-purple/20 text-foreground" />
      </div>

      <div className="space-y-1">
        <Label className="text-muted-base text-[10px] uppercase tracking-widest">Frequency</Label>
        <div className="flex gap-2 flex-wrap">
          {([
            ["biweekly", "Every 2 Weeks"],
            ["monthly", "Monthly"],
            ["one_time", "One-Time"],
          ] as const).map(([val, label]) => (
            <button key={val} type="button"
              onClick={() => setFrequency(val)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                frequency === val
                  ? "bg-gradient-brand text-white"
                  : "bg-bg-deep border border-accent-purple/20 text-muted-base hover:text-foreground"
              }`}>
              {label}
            </button>
          ))}
        </div>
        <input type="hidden" name="frequency" value={frequency} />
      </div>

      <div className="space-y-1">
        <Label className="text-muted-base text-[10px] uppercase tracking-widest">Status</Label>
        <select name="status"
          className="w-full bg-bg-deep border border-accent-purple/20 text-foreground rounded-xl px-4 py-2.5">
          <option value="expected">Expected</option>
          <option value="might_arrive">Might Arrive</option>
        </select>
      </div>

      {frequency === "one_time" && (
        <div className="space-y-1">
          <Label className="text-muted-base text-[10px] uppercase tracking-widest">Expected Date</Label>
          <Input name="expectedDate" type="date" required
            className="bg-bg-deep border-accent-purple/20 text-foreground" />
        </div>
      )}

      {state && !state.success && (
        <p className="text-sm text-red-400">{state.message}</p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending} className="flex-1 bg-gradient-brand text-white font-bold">
          {pending ? "Saving…" : "Save"}
        </Button>
        <Button type="button" variant="outline" onClick={() => setOpen(false)}
          className="border-accent-purple/20 text-muted-base">Cancel</Button>
      </div>
    </form>
  );
}
