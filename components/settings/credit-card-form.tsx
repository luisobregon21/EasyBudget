"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { createCreditCard } from "@/lib/actions/credit-cards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PaymentType = "credit" | "debit" | "ath_movil";

const TYPE_OPTIONS: { value: PaymentType; label: string }[] = [
  { value: "credit",    label: "Credit Card" },
  { value: "debit",     label: "Debit Card"  },
  { value: "ath_movil", label: "ATH Móvil"   },
];

export function AddCardForm() {
  const [formKey, setFormKey] = useState(0);
  const [type, setType] = useState<PaymentType>("credit");
  const [state, formAction, isPending] = useActionState(createCreditCard, null);
  const toastedState = useRef<typeof state>(null);

  useEffect(() => {
    if (!state || state === toastedState.current) return;
    toastedState.current = state;
    if (state.success) {
      toast.success(state.message);
      setFormKey((k) => k + 1);
      setType("credit");
    } else {
      toast.error(state.message);
    }
  }, [state]);

  return (
    <form key={formKey} action={formAction}
      className="rounded-2xl bg-white/[0.03] border border-accent-purple/10 p-4 space-y-3">
      <p className="text-muted-base text-xs uppercase tracking-widest">Add Payment Method</p>

      <div className="space-y-1">
        <Label className="text-muted-base text-[10px] uppercase tracking-widest">Type</Label>
        <div className="flex gap-2 flex-wrap">
          {TYPE_OPTIONS.map((o) => (
            <button key={o.value} type="button" onClick={() => setType(o.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                type === o.value
                  ? "bg-gradient-brand text-white"
                  : "bg-bg-deep border border-accent-purple/20 text-muted-base hover:text-foreground"
              }`}>
              {o.label}
            </button>
          ))}
        </div>
        <input type="hidden" name="type" value={type} />
      </div>

      <div className="flex gap-3">
        <div className="flex-1 space-y-1">
          <Label className="text-muted-base text-[10px] uppercase tracking-widest">Name</Label>
          <Input name="name" required
            placeholder={
              type === "credit" ? "Chase Sapphire" :
              type === "debit"  ? "FirstBank Debit" : "ATH Móvil"
            }
            className="bg-bg-deep border-accent-purple/20 text-foreground" />
        </div>
        {type === "credit" && (
          <div className="w-24 space-y-1">
            <Label className="text-muted-base text-[10px] uppercase tracking-widest">Due Day</Label>
            <Input name="dueDay" type="number" min="1" max="31" required placeholder="15"
              className="bg-bg-deep border-accent-purple/20 text-foreground" />
          </div>
        )}
      </div>

      {type === "credit" && (
        <div className="space-y-1">
          <Label className="text-muted-base text-[10px] uppercase tracking-widest">
            Credit Limit <span className="normal-case text-muted-base font-normal">— optional, enables utilization tracking</span>
          </Label>
          <Input
            name="creditLimit"
            type="number"
            step="0.01"
            min="0"
            placeholder="5000"
            className="bg-bg-deep border-accent-purple/20 text-foreground"
          />
        </div>
      )}

      {state?.success === false && (
        <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
          {state.message}
        </p>
      )}
      <Button type="submit" disabled={isPending} className="bg-gradient-brand text-white font-bold w-full">
        {isPending ? "Saving…" : "Add Payment Method"}
      </Button>
    </form>
  );
}
