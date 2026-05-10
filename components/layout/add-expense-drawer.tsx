"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { createExpense } from "@/lib/actions/expenses";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PaymentMethodPicker } from "@/components/expenses/payment-method-picker";
import { TagPickerWrapper } from "@/components/expenses/tag-picker-wrapper";
import { toast } from "sonner";
import { X, ChevronDown, ChevronUp } from "lucide-react";
import { currentYearMonth } from "@/lib/utils";

type SavedMethod = { id: number; name: string; type: string };

interface Props {
  open: boolean;
  onClose: () => void;
  paymentMethods: SavedMethod[];
  tags: { id: number; name: string; emoji: string; defaultBucket: "savings" | "bills" | "wants" }[];
}

export function AddExpenseDrawer({ open, onClose, paymentMethods, tags }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const { year, month } = currentYearMonth();
  const today = new Date().toISOString().split("T")[0];

  const [state, action, pending] = useActionState(createExpense, undefined);
  const toastedState = useRef<typeof state>(undefined);

  useEffect(() => {
    if (!state || state === toastedState.current) return;
    toastedState.current = state;
    if (state.success) {
      toast.success(state.message);
      onClose();
      setFormKey((k) => k + 1);
    } else {
      toast.error(state.message);
    }
  }, [state]);

  useEffect(() => {
    if (!open) {
      setExpanded(false);
      toastedState.current = undefined;
      setFormKey((k) => k + 1);
    }
  }, [open]);

  if (!open) return null;

  return (
    <>
      {/* backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-[60]"
        onClick={onClose}
      />

      {/* drawer (mobile = bottom sheet, desktop = centered modal) */}
      <div className="fixed z-[70] bg-[#1e1235] border border-accent-purple/30 shadow-2xl
        bottom-0 inset-x-0 rounded-t-2xl border-t
        md:bottom-auto md:inset-x-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2
        md:w-full md:max-w-md md:rounded-2xl">
        {/* handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 rounded-full bg-white/20" />
        </div>

        {/* header */}
        <div className="flex items-center justify-between px-5 py-3">
          <p className="text-foreground font-bold text-base">Add Expense</p>
          <button type="button" onClick={onClose} className="text-muted-base hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        <form key={formKey} action={action} className="px-5 pb-8 space-y-4">
          <input type="hidden" name="year"  value={year} />
          <input type="hidden" name="month" value={month} />

          {/* amount + currency */}
          <div className="flex gap-2 items-center">
            <select
              name="currency"
              className="bg-accent-purple/15 border border-accent-purple/30 text-accent-purple-light rounded-xl px-3 py-2.5 text-sm font-semibold"
            >
              {["USD","NIO","GTQ","MXN","EUR","GBP","CAD"].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <Input
              name="amount"
              type="number"
              step="0.01"
              min="0"
              required
              placeholder="0.00"
              className="flex-1 bg-bg-deep border-accent-purple/20 text-foreground text-xl font-bold"
            />
          </div>

          {/* description */}
          <Input
            name="description"
            required
            placeholder="What was this for?"
            className="bg-bg-deep border-accent-purple/20 text-foreground"
          />

          {/* payment method */}
          <div className="space-y-2">
            <p className="text-muted-base text-[10px] uppercase tracking-widest">Paid with</p>
            <PaymentMethodPicker methods={paymentMethods} />
          </div>

          {/* more options toggle */}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-2 text-accent-purple-light text-xs w-full justify-center py-1"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {expanded ? "Fewer options" : "More options"}
          </button>

          {/* expanded section */}
          {expanded && (
            <div className="space-y-4 bg-white/[0.03] border border-accent-purple/10 rounded-xl p-4">
              <div className="space-y-1">
                <p className="text-muted-base text-[10px] uppercase tracking-widest">Date</p>
                <Input
                  name="date"
                  type="date"
                  defaultValue={today}
                  className="bg-bg-deep border-accent-purple/20 text-foreground"
                />
              </div>
              <div className="space-y-1">
                <p className="text-muted-base text-[10px] uppercase tracking-widest">Category & Bucket</p>
                <TagPickerWrapper tags={tags} />
              </div>
            </div>
          )}

          {/* hidden date fallback when not expanded */}
          {!expanded && <input type="hidden" name="date" value={today} />}
          {/* hidden bucket fallback */}
          {!expanded && <input type="hidden" name="bucket" value="wants" />}

          <Button
            type="submit"
            disabled={pending}
            className="w-full bg-gradient-brand text-white font-bold py-3 rounded-xl text-base"
          >
            {pending ? "Saving…" : "Save Expense"}
          </Button>
        </form>
      </div>
    </>
  );
}
