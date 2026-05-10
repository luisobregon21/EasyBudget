"use client";
import { useState } from "react";
import { updateMonthAllocation } from "@/lib/actions/months";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Pencil, X } from "lucide-react";

interface Props {
  monthId: number;
  savingsPct: number;
  billsPct: number;
  wantsPct: number;
}

export function AllocationEditor({ monthId, savingsPct, billsPct, wantsPct }: Props) {
  const [open, setOpen] = useState(false);
  const [s, setS] = useState(savingsPct);
  const [b, setB] = useState(billsPct);
  const [w, setW] = useState(wantsPct);
  const [pending, setPending] = useState(false);

  const total = s + b + w;
  const valid = total === 100;

  async function handleSave() {
    if (!valid) return;
    setPending(true);
    try {
      await updateMonthAllocation(monthId, s, w, b);
      toast.success("Allocation updated.");
      setOpen(false);
    } catch {
      toast.error("Failed to update allocation.");
    } finally {
      setPending(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-muted-base hover:text-foreground transition-colors"
      >
        <Pencil size={12} /> Edit percentages
      </button>
    );
  }

  return (
    <div className="rounded-2xl bg-white/[0.03] border border-accent-purple/10 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-foreground font-semibold text-sm">Edit Monthly Allocation</p>
        <button type="button" onClick={() => setOpen(false)} className="text-muted-base hover:text-foreground">
          <X size={16} />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Savings", value: s, set: setS, color: "text-amber-400" },
          { label: "Bills",   value: b, set: setB, color: "text-pink-400" },
          { label: "Personal", value: w, set: setW, color: "text-violet-400" },
        ].map(({ label, value, set, color }) => (
          <div key={label} className="space-y-1">
            <label className={`text-[10px] uppercase tracking-widest ${color}`}>{label}</label>
            <div className="relative">
              <Input
                type="number"
                min={0}
                max={100}
                value={value}
                onChange={(e) => set(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                className="bg-bg-deep border-accent-purple/20 text-foreground pr-6"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-base text-sm">%</span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <span className={`text-xs font-semibold ${valid ? "text-green-400" : "text-red-400"}`}>
          Total: {total}%{!valid ? " — must equal 100%" : ""}
        </span>
        <Button
          type="button"
          onClick={handleSave}
          disabled={!valid || pending}
          className="bg-gradient-brand text-white font-bold text-sm"
        >
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}
