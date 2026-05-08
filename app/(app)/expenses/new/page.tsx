import { requireSession } from "@/lib/auth/session";
import { getUserTags } from "@/lib/actions/tags";
import { createExpense } from "@/lib/actions/expenses";
import { currentYearMonth } from "@/lib/utils";
import { PaymentMethodPicker } from "@/components/expenses/payment-method-picker";
import { CurrencyPicker } from "@/components/expenses/currency-picker";
import { TagPickerWrapper } from "@/components/expenses/tag-picker-wrapper";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function NewExpensePage() {
  await requireSession();
  const tags = await getUserTags();
  const { year, month } = currentYearMonth();
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="text-muted-base hover:text-foreground"><ChevronLeft size={20} /></Link>
        <h2 className="text-foreground text-xl font-bold">Add Expense</h2>
      </div>

      <form action={createExpense} className="space-y-5">
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
          <TagPickerWrapper tags={tags as any} />
        </div>

        <div className="space-y-1">
          <Label className="text-muted-base text-[10px] uppercase tracking-widest">Paid with</Label>
          <PaymentMethodPicker />
        </div>

        <Button type="submit" className="w-full bg-gradient-brand text-white font-bold py-3 rounded-xl">
          Save Expense
        </Button>
      </form>
    </div>
  );
}
