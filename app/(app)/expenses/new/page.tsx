import { requireSession } from "@/lib/auth/session";
import { getUserTags } from "@/lib/actions/tags";
import { getCreditCards } from "@/lib/actions/credit-cards";
import { currentYearMonth } from "@/lib/utils";
import { NewExpenseForm } from "@/components/expenses/new-expense-form";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function NewExpensePage() {
  await requireSession();
  const [tags, paymentMethods] = await Promise.all([getUserTags(), getCreditCards()]);
  const { year, month } = currentYearMonth();
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="text-muted-base hover:text-foreground"><ChevronLeft size={20} /></Link>
        <h2 className="text-foreground text-xl font-bold">Add Expense</h2>
      </div>
      <NewExpenseForm tags={tags as any} paymentMethods={paymentMethods} year={year} month={month} today={today} />
    </div>
  );
}
