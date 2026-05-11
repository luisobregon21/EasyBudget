import { getOrCreateMonth } from "@/lib/actions/months";
import { seedDefaultTags } from "@/lib/actions/tags";
import { getExpensesForMonth } from "@/lib/actions/expenses";
import { getUpcomingBills } from "@/lib/actions/bills";
import { getIncomeEntries, cleanupBackfilledPastEntries } from "@/lib/actions/income";
import { currentYearMonth, calcIncomeTotals } from "@/lib/utils";
import { HeroCard } from "@/components/dashboard/hero-card";
import { AllocationCard } from "@/components/dashboard/allocation-card";
import { ExpenseList } from "@/components/dashboard/expense-list";
import { UpcomingBillsStrip } from "@/components/dashboard/upcoming-bills-strip";
import { MonthSwitcher } from "@/components/layout/month-switcher";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const params = await searchParams;
  await seedDefaultTags();
  await cleanupBackfilledPastEntries();

  const def = currentYearMonth();
  const year  = parseInt(params.year  ?? String(def.year));
  const month = parseInt(params.month ?? String(def.month));

  const monthData = await getOrCreateMonth(year, month);
  const [expenseRows, upcomingBills, incomeEntries] = await Promise.all([
    getExpensesForMonth(monthData.id),
    getUpcomingBills(7),
    getIncomeEntries(monthData.id),
  ]);

  const { budgetTotal, actualBalance, possible } = calcIncomeTotals(incomeEntries);
  const incomeBasis = budgetTotal > 0 ? budgetTotal : (monthData.income ?? 0);

  const totalExpenses = expenseRows.reduce((sum, e) => sum + (e.amountUsd ?? 0), 0);
  const byBucket = (bucket: string) =>
    expenseRows.filter((e) => e.bucket === bucket).reduce((s, e) => s + (e.amountUsd ?? 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-foreground text-xl font-bold">Overview</h2>
          <p className="text-muted-base text-sm">Your month at a glance</p>
        </div>
        <MonthSwitcher year={year} month={month} />
      </div>

      <HeroCard
        budgetTotal={budgetTotal > 0 ? budgetTotal : (monthData.income ?? 0)}
        actualBalance={actualBalance > 0 ? actualBalance : (monthData.income ?? 0)}
        possible={possible}
        openingBalance={monthData.openingBalance ?? 0}
        totalExpenses={totalExpenses}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <AllocationCard bucket="savings" pct={monthData.savingsPct ?? 20} income={incomeBasis} spent={byBucket("savings")} />
        <AllocationCard bucket="bills"   pct={monthData.billsPct  ?? 70} income={incomeBasis} spent={byBucket("bills")} />
        <AllocationCard bucket="wants"   pct={monthData.wantsPct  ?? 10} income={incomeBasis} spent={byBucket("wants")} />
      </div>

      <UpcomingBillsStrip bills={upcomingBills} />
      <ExpenseList expenses={expenseRows as any} />
    </div>
  );
}
