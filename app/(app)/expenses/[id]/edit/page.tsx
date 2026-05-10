import { getExpense, updateExpense } from "@/lib/actions/expenses";
import { getUserTags } from "@/lib/actions/tags";
import { getCreditCards } from "@/lib/actions/credit-cards";
import { notFound } from "next/navigation";
import { PaymentMethodPicker } from "@/components/expenses/payment-method-picker";
import { CurrencyPicker } from "@/components/expenses/currency-picker";
import { TagPickerWrapper } from "@/components/expenses/tag-picker-wrapper";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function EditExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const expenseId = parseInt(id);

  const [expense, tags, paymentMethods] = await Promise.all([
    getExpense(expenseId),
    getUserTags(),
    getCreditCards(),
  ]);

  if (!expense) notFound();

  const action = updateExpense.bind(null, expenseId);

  // Derive the default picker value: card id or "cash"
  const defaultPaymentMethod = expense.paymentMethodId
    ? String(expense.paymentMethodId)
    : "cash";

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/expenses" className="text-muted-base hover:text-foreground"><ChevronLeft size={20} /></Link>
        <h2 className="text-foreground text-xl font-bold">Edit Expense</h2>
      </div>

      <form action={action} className="space-y-5">
        <div className="space-y-1">
          <Label className="text-muted-base text-[10px] uppercase tracking-widest">Amount</Label>
          <CurrencyPicker
            defaultCurrency={expense.currency}
            defaultAmount={String(expense.amount)}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="description" className="text-muted-base text-[10px] uppercase tracking-widest">Description</Label>
          <Input
            id="description"
            name="description"
            required
            defaultValue={expense.description}
            className="bg-bg-deep border-accent-purple/20 text-foreground"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="date" className="text-muted-base text-[10px] uppercase tracking-widest">Date</Label>
          <Input
            id="date"
            name="date"
            type="date"
            required
            defaultValue={expense.date}
            className="bg-bg-deep border-accent-purple/20 text-foreground"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-muted-base text-[10px] uppercase tracking-widest">Category</Label>
          <TagPickerWrapper
            tags={tags as any}
            defaultTagId={expense.tagId}
            defaultBucket={expense.bucket as any}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-muted-base text-[10px] uppercase tracking-widest">Paid with</Label>
          <PaymentMethodPicker methods={paymentMethods} defaultValue={defaultPaymentMethod} />
        </div>

        <Button type="submit" className="w-full bg-gradient-brand text-white font-bold py-3 rounded-xl">
          Save Changes
        </Button>
      </form>
    </div>
  );
}
