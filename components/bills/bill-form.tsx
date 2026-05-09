"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

type ActionResult = { success: boolean; message: string };
type CreditCard = { id: number; name: string; dueDay: number };

interface BillFormProps {
  creditCards: CreditCard[];
  action: (prevState: unknown, formData: FormData) => Promise<ActionResult>;
  defaultValues?: {
    name?: string;
    amount?: number;
    description?: string;
    frequency?: "monthly" | "yearly";
    dueDay?: number;
    renewalMonth?: number | null;
    renewalDay?: number | null;
    type?: string;
    creditCardId?: number | null;
    reminderDaysBefore?: number;
  };
  submitLabel?: string;
}

export function BillForm({ creditCards, action, defaultValues = {}, submitLabel = "Save Bill" }: BillFormProps) {
  const [state, formAction, pending] = useActionState(action, null);
  const toastedState = useRef<typeof state>(null);

  useEffect(() => {
    if (!state || state === toastedState.current) return;
    toastedState.current = state;
    if (state.success) toast.success(state.message);
    else toast.error(state.message);
  }, [state]);

  const [frequency, setFrequency] = useState<"monthly" | "yearly">(defaultValues.frequency ?? "monthly");
  const [type, setType] = useState(defaultValues.type ?? "subscription");

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-1">
        <Label className="text-muted-base text-[10px] uppercase tracking-widest">Name</Label>
        <Input name="name" required placeholder="Netflix" defaultValue={defaultValues.name}
          className="bg-bg-deep border-accent-purple/20 text-foreground" />
      </div>

      <div className="space-y-1">
        <Label className="text-muted-base text-[10px] uppercase tracking-widest">Amount (USD)</Label>
        <Input name="amount" type="number" step="0.01" min="0" required placeholder="30.00"
          defaultValue={defaultValues.amount}
          className="bg-bg-deep border-accent-purple/20 text-foreground" />
      </div>

      <div className="space-y-1">
        <Label className="text-muted-base text-[10px] uppercase tracking-widest">Description (optional)</Label>
        <Input name="description" placeholder="Notes about this bill" defaultValue={defaultValues.description ?? ""}
          className="bg-bg-deep border-accent-purple/20 text-foreground" />
      </div>

      <div className="space-y-1">
        <Label className="text-muted-base text-[10px] uppercase tracking-widest">Frequency</Label>
        <div className="flex gap-2">
          {(["monthly", "yearly"] as const).map((f) => (
            <button key={f} type="button"
              onClick={() => setFrequency(f)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-colors ${
                frequency === f
                  ? "bg-gradient-brand text-white"
                  : "bg-bg-deep border border-accent-purple/20 text-muted-base hover:text-foreground"
              }`}>
              {f}
            </button>
          ))}
        </div>
        <input type="hidden" name="frequency" value={frequency} />
      </div>

      {frequency === "monthly" && (
        <div className="space-y-1">
          <Label className="text-muted-base text-[10px] uppercase tracking-widest">Due Day of Month</Label>
          <Input name="dueDay" type="number" min="1" max="31" required placeholder="8"
            defaultValue={defaultValues.dueDay}
            className="bg-bg-deep border-accent-purple/20 text-foreground" />
        </div>
      )}

      {frequency === "yearly" && (
        <div className="flex gap-3">
          <div className="flex-1 space-y-1">
            <Label className="text-muted-base text-[10px] uppercase tracking-widest">Renewal Month</Label>
            <select name="renewalMonth" required
              defaultValue={defaultValues.renewalMonth ?? 1}
              className="w-full bg-bg-deep border border-accent-purple/20 text-foreground rounded-xl px-4 py-2.5">
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div className="w-28 space-y-1">
            <Label className="text-muted-base text-[10px] uppercase tracking-widest">Day</Label>
            <Input name="renewalDay" type="number" min="1" max="31" required placeholder="15"
              defaultValue={defaultValues.renewalDay ?? ""}
              className="bg-bg-deep border-accent-purple/20 text-foreground" />
          </div>
        </div>
      )}

      <div className="space-y-1">
        <Label className="text-muted-base text-[10px] uppercase tracking-widest">Type</Label>
        <select name="type" required value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full bg-bg-deep border border-accent-purple/20 text-foreground rounded-xl px-4 py-2.5">
          <option value="subscription">Subscription</option>
          <option value="utility">Utility</option>
          <option value="credit_card">Credit Card</option>
          <option value="loan">Loan</option>
          <option value="other">Other</option>
        </select>
      </div>

      {type === "subscription" && (
        <div className="space-y-1">
          <Label className="text-muted-base text-[10px] uppercase tracking-widest">Credit Card</Label>
          <select name="creditCardId"
            defaultValue={defaultValues.creditCardId ?? "none"}
            className="w-full bg-bg-deep border border-accent-purple/20 text-foreground rounded-xl px-4 py-2.5">
            <option value="none">None</option>
            {creditCards.map((c) => (
              <option key={c.id} value={c.id}>{c.name} (due day {c.dueDay})</option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-1">
        <Label className="text-muted-base text-[10px] uppercase tracking-widest">Remind me (days before)</Label>
        <Input name="reminderDaysBefore" type="number" min="1" max="14"
          defaultValue={defaultValues.reminderDaysBefore ?? 3}
          className="bg-bg-deep border-accent-purple/20 text-foreground" />
      </div>

      {state && !state.success && (
        <p className="text-sm text-red-400">{state.message}</p>
      )}

      <Button type="submit" disabled={pending} className="w-full bg-gradient-brand text-white font-bold py-3 rounded-xl">
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
