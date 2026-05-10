import { getOrCreateMonth } from "@/lib/actions/months";
import { getExpensesForMonth, deleteExpense } from "@/lib/actions/expenses";
import { currentYearMonth, formatCurrency } from "@/lib/utils";
import { MonthSwitcher } from "@/components/layout/month-switcher";
import { FireAndForgetButton } from "@/components/ui/fire-and-forget-button";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";

const BUCKET_COLOR: Record<string, string> = {
  savings: "text-amber-400",
  bills:   "text-pink-400",
  wants:   "text-violet-400",
};

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const params = await searchParams;
  const def = currentYearMonth();
  const year  = parseInt(params.year  ?? String(def.year));
  const month = parseInt(params.month ?? String(def.month));

  const monthData  = await getOrCreateMonth(year, month);
  const expenseList = await getExpensesForMonth(monthData.id);

  const total = expenseList.reduce((s, e) => s + e.amountUsd, 0);

  // Group by date
  const grouped: Record<string, typeof expenseList> = {};
  for (const e of expenseList) {
    if (!grouped[e.date]) grouped[e.date] = [];
    grouped[e.date].push(e);
  }
  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-foreground text-xl font-bold">Expenses</h2>
          <p className="text-muted-base text-sm">{formatCurrency(total)} spent</p>
        </div>
        <MonthSwitcher year={year} month={month} />
      </div>

      {expenseList.length === 0 && (
        <p className="text-muted-base text-sm text-center py-12">No expenses this month.</p>
      )}

      <div className="space-y-5">
        {dates.map((date) => (
          <div key={date}>
            <p className="text-muted-base text-[10px] uppercase tracking-widest mb-2">
              {new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            </p>
            <div className="rounded-2xl bg-white/[0.03] border border-accent-purple/10 divide-y divide-white/5">
              {grouped[date].map((e) => (
                <div key={e.id} className="flex items-center justify-between p-4 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xl shrink-0">{e.tagEmoji ?? "📦"}</span>
                    <div className="min-w-0">
                      <p className="text-foreground text-sm font-medium truncate">{e.description}</p>
                      <p className="text-muted-base text-[10px]">
                        {e.tagName ?? "Uncategorized"}
                        <span className={`ml-1.5 font-semibold ${BUCKET_COLOR[e.bucket] ?? ""}`}>· {e.bucket}</span>
                        {e.tripName && <span className="ml-1.5">· ✈️ {e.tripName}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-red-400 font-bold text-sm">{formatCurrency(e.amountUsd)}</p>
                      {e.currency !== "USD" && (
                        <p className="text-muted-base text-[10px]">{e.amount} {e.currency}</p>
                      )}
                    </div>
                    <Link href={`/expenses/${e.id}/edit`} className="text-muted-base hover:text-foreground transition-colors">
                      <Pencil size={14} />
                    </Link>
                    <FireAndForgetButton
                      action={deleteExpense.bind(null, e.id)}
                      className="text-muted-base hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={14} />
                    </FireAndForgetButton>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
