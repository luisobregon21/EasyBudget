import { getExpense, updateExpense } from "@/lib/actions/expenses";
import { getUserTags } from "@/lib/actions/tags";
import { getCreditCards } from "@/lib/actions/credit-cards";
import { getUserBills } from "@/lib/actions/bills";
import { getUserTrips } from "@/lib/actions/trips";
import { notFound } from "next/navigation";
import { PaymentMethodPicker } from "@/components/expenses/payment-method-picker";
import { CurrencyPicker } from "@/components/expenses/currency-picker";
import { TagPickerWrapper } from "@/components/expenses/tag-picker-wrapper";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { matchTagFromDescription } from "@/lib/tag-matcher";

export default async function EditExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const expenseId = parseInt(id);

  const [expense, tags, paymentMethods, bills, trips] = await Promise.all([
    getExpense(expenseId),
    getUserTags(),
    getCreditCards(),
    getUserBills(),
    getUserTrips(),
  ]);

  if (!expense) notFound();

  const action = updateExpense.bind(null, expenseId);

  // Derive the default picker value: card id or "cash"
  const defaultPaymentMethod = expense.paymentMethodId
    ? String(expense.paymentMethodId)
    : "cash";

  // Auto-suggest a tag from the description only if the expense is currently untagged.
  const suggestedTagId = !expense.tagId
    ? matchTagFromDescription(expense.description, tags)?.id ?? null
    : null;

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
            suggestedTagId={suggestedTagId}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-muted-base text-[10px] uppercase tracking-widest">Paid with</Label>
          <PaymentMethodPicker methods={paymentMethods} defaultValue={defaultPaymentMethod} />
        </div>

        {bills.length > 0 && (
          <div className="space-y-1">
            <Label htmlFor="billId" className="text-muted-base text-[10px] uppercase tracking-widest">
              Pays a bill? <span className="normal-case text-muted-base font-normal">— optional, marks bill paid for the month</span>
            </Label>
            <select
              id="billId"
              name="billId"
              defaultValue={expense.billId ? String(expense.billId) : "none"}
              className="w-full bg-bg-deep border border-accent-purple/20 text-foreground rounded-lg px-3 py-2 text-sm"
            >
              <option value="none">— None —</option>
              {bills.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        )}

        {trips.length > 0 && (
          <div className="space-y-1">
            <Label htmlFor="tripId" className="text-muted-base text-[10px] uppercase tracking-widest">
              Trip? <span className="normal-case text-muted-base font-normal">— optional, shows this expense on the trip page</span>
            </Label>
            <select
              id="tripId"
              name="tripId"
              defaultValue={expense.tripId ? String(expense.tripId) : "none"}
              className="w-full bg-bg-deep border border-accent-purple/20 text-foreground rounded-lg px-3 py-2 text-sm"
            >
              <option value="none">— None —</option>
              {trips.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.startDate}{t.endDate ? ` → ${t.endDate}` : " · ongoing"})
                </option>
              ))}
            </select>
          </div>
        )}

        <Button type="submit" className="w-full bg-gradient-brand text-white font-bold py-3 rounded-xl">
          Save Changes
        </Button>
      </form>
    </div>
  );
}
