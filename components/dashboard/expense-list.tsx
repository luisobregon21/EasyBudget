import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { IconTile } from "@/components/ui/icon-tile";
import { tagIcon } from "@/lib/icons";

type Expense = {
  id: number;
  description: string;
  amountUsd: number;
  currency: string;
  amount: number;
  date: string;
  tagEmoji: string | null;
  tagName: string | null;
  paymentMethod: string;
};

const METHOD_LABEL: Record<string, string> = {
  cash: "💵 Cash",
  debit: "💳 Debit",
  credit_card: "💳 CC",
};

export function ExpenseList({ expenses }: { expenses: Expense[] }) {
  return (
    <div className="rounded-2xl bg-white/[0.03] border border-accent-purple/10 p-5">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-accent-purple-light text-[10px] uppercase tracking-widest font-semibold">
          Recent Expenses
        </h3>
        <Link href="/expenses" className="text-muted-base text-xs hover:text-foreground">
          View all →
        </Link>
      </div>
      {expenses.length === 0 && (
        <p className="text-muted-base text-sm text-center py-6">No expenses yet this month</p>
      )}
      {expenses.slice(0, 8).map((e) => (
        <div
          key={e.id}
          className="flex justify-between items-center py-2.5 border-b border-white/5 last:border-0"
        >
          <div className="flex items-center gap-3">
            <IconTile icon={tagIcon(e.tagName ?? e.tagEmoji)} />
            <div>
              <p className="text-foreground text-sm font-medium">{e.description}</p>
              <p className="text-muted-base text-[10px]">
                {e.tagName ?? "Uncategorized"} · {METHOD_LABEL[e.paymentMethod] ?? e.paymentMethod}
              </p>
            </div>
          </div>
          <span className="text-red-400 text-sm font-semibold">-{formatCurrency(e.amountUsd)}</span>
        </div>
      ))}
    </div>
  );
}
