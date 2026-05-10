"use client";
import { useActionState, useEffect, useRef } from "react";
import { createExpense } from "@/lib/actions/expenses";
import { PaymentMethodPicker } from "@/components/expenses/payment-method-picker";
import { CurrencyPicker } from "@/components/expenses/currency-picker";
import { TagPickerWrapper } from "@/components/expenses/tag-picker-wrapper";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type SavedMethod = { id: number; name: string; type: string };
type Tag = { id: number; name: string; emoji: string; defaultBucket: "savings" | "bills" | "wants" };

interface Props {
  tags: Tag[];
  paymentMethods: SavedMethod[];
  year: number;
  month: number;
  today: string;
}

export function NewExpenseForm({ tags, paymentMethods, year, month, today }: Props) {
  const router = useRouter();
  const [state, action, pending] = useActionState(createExpense, undefined);
  const toastedState = useRef<typeof state>(undefined);

  useEffect(() => {
    if (!state || state === toastedState.current) return;
    toastedState.current = state;
    if (state.success) {
      toast.success(state.message);
      router.push("/");
    } else {
      toast.error(state.message);
    }
  }, [state]);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="year"  value={year} />
      <input type="hidden" name="month" value={month} />

      <div className="space-y-1">
        <Label className="text-muted-base text-[10px] uppercase tracking-widest">Amount</Label>
        <CurrencyPicker />
      </div>

      <div className="space-y-1">
        <Label htmlFor="description" className="text-muted-base text-[10px] uppercase tracking-widest">Description</Label>
        <Input id="description" name="description" required placeholder="DoorDash — dinner"
          className="bg-bg-deep border-accent-purple/20 text-foreground" />
      </div>

      <div className="space-y-1">
        <Label htmlFor="date" className="text-muted-base text-[10px] uppercase tracking-widest">Date</Label>
        <Input id="date" name="date" type="date" required defaultValue={today}
          className="bg-bg-deep border-accent-purple/20 text-foreground" />
      </div>

      <div className="space-y-1">
        <Label className="text-muted-base text-[10px] uppercase tracking-widest">Category</Label>
        <TagPickerWrapper tags={tags} />
      </div>

      <div className="space-y-1">
        <Label className="text-muted-base text-[10px] uppercase tracking-widest">Paid with</Label>
        <PaymentMethodPicker methods={paymentMethods} />
      </div>

      <Button type="submit" disabled={pending} className="w-full bg-gradient-brand text-white font-bold py-3 rounded-xl">
        {pending ? "Saving…" : "Save Expense"}
      </Button>
    </form>
  );
}
