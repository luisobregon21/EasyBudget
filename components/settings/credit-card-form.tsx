"use client";
import { useState, useActionState, useEffect, useRef } from "react";
import { createCreditCard } from "@/lib/actions/credit-cards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function CreditCardForm() {
  const [formKey, setFormKey] = useState(0);
  const [state, formAction, pending] = useActionState(createCreditCard, null);
  const toastedState = useRef<typeof state>(null);

  useEffect(() => {
    if (!state || state === toastedState.current) return;
    toastedState.current = state;
    if (state.success) {
      toast.success(state.message);
      setFormKey((k) => k + 1);  // reset form
    } else toast.error(state.message);
  }, [state]);

  return (
    <form key={formKey} action={formAction} className="rounded-2xl bg-white/[0.03] border border-accent-purple/10 p-4 space-y-3">
      <p className="text-muted-base text-xs uppercase tracking-widest">Add a Card</p>
      <div className="flex gap-3">
        <div className="flex-1 space-y-1">
          <Label className="text-muted-base text-[10px] uppercase tracking-widest">Card Name</Label>
          <Input name="name" required placeholder="Chase Sapphire"
            className="bg-bg-deep border-accent-purple/20 text-foreground" />
        </div>
        <div className="w-24 space-y-1">
          <Label className="text-muted-base text-[10px] uppercase tracking-widest">Due Day</Label>
          <Input name="dueDay" type="number" min="1" max="31" required placeholder="15"
            className="bg-bg-deep border-accent-purple/20 text-foreground" />
        </div>
      </div>
      {state && !state.success && (
        <p className="text-sm text-red-400">{state.message}</p>
      )}
      <Button type="submit" disabled={pending} className="bg-gradient-brand text-white font-bold w-full">
        {pending ? "Saving…" : "Add Card"}
      </Button>
    </form>
  );
}
