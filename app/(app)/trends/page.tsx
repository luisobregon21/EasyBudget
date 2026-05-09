import { getOrCreateMonth } from "@/lib/actions/months";
import { getExpensesForMonth, getExpensesByPaymentMethod } from "@/lib/actions/expenses";
import { currentYearMonth, formatCurrency } from "@/lib/utils";
import { MonthSwitcher } from "@/components/layout/month-switcher";

export default async function TrendsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const params = await searchParams;
  const def = currentYearMonth();
  const year  = parseInt(params.year  ?? String(def.year));
  const month = parseInt(params.month ?? String(def.month));

  const monthData = await getOrCreateMonth(year, month);
  const [expenseList, byMethod] = await Promise.all([
    getExpensesForMonth(monthData.id),
    getExpensesByPaymentMethod(monthData.id),
  ]);

  const totalSpent = expenseList.reduce((s, e) => s + e.amountUsd, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-foreground text-xl font-bold">Trends</h2>
          <p className="text-muted-base text-sm">Spending patterns this month</p>
        </div>
        <MonthSwitcher year={year} month={month} />
      </div>

      {byMethod.length > 0 ? (
        <section className="space-y-3">
          <h3 className="text-foreground font-semibold">By Payment Method</h3>
          <div className="rounded-2xl bg-white/[0.03] border border-accent-purple/10 divide-y divide-white/5">
            {byMethod.map((m) => {
              const pct = totalSpent > 0 ? Math.round((m.total / totalSpent) * 100) : 0;
              return (
                <div key={m.key} className="flex items-center justify-between p-4 gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground font-medium">{m.name}</p>
                    <div className="mt-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-brand" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-amber-400 font-bold">{formatCurrency(m.total)}</p>
                    <p className="text-muted-base text-xs">{pct}%</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : (
        <p className="text-muted-base text-sm text-center py-8">No expenses recorded this month yet.</p>
      )}
    </div>
  );
}
