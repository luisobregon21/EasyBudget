import { getOrCreateMonth, getMonth } from "@/lib/actions/months";
import { getIncomeEntries } from "@/lib/actions/income";
import { getExpensesForMonth, getRecentExpenses } from "@/lib/actions/expenses";
import { getUpcomingBills } from "@/lib/actions/bills";
import { currentYearMonth, calcIncomeTotals, formatMonth } from "@/lib/utils";
import { daysIntoMonth, projectedTotal } from "@/lib/actions/forecast";
import { ContextStrip } from "@/components/layout/context-strip";
import { MonthSwitcher } from "@/components/layout/month-switcher";
import { IncomeHero } from "@/components/income/income-hero";
import { IncomeEntryList } from "@/components/income/income-entry-list";
import { GoesToCard } from "@/components/income/goes-to-card";
import { IncomeForm } from "@/components/income/income-form";

function prevMonthCoords(year: number, month: number) {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

export default async function IncomePage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const params = await searchParams;
  const def   = currentYearMonth();
  const year  = parseInt(params.year  ?? String(def.year));
  const month = parseInt(params.month ?? String(def.month));

  const monthData = await getOrCreateMonth(year, month);
  const last      = prevMonthCoords(year, month);
  const lastMonthData = await getMonth(last.year, last.month);

  const [entries, expenseRows, upcomingBills, lastMonthExpenses] = await Promise.all([
    getIncomeEntries(monthData.id),
    getExpensesForMonth(monthData.id),
    getUpcomingBills(7),
    lastMonthData ? getExpensesForMonth(lastMonthData.id) : Promise.resolve([]),
  ]);

  const { budgetTotal, actualBalance } = calcIncomeTotals(entries);
  const income     = budgetTotal > 0 ? budgetTotal : (monthData.income ?? 0);
  const arrived    = actualBalance;
  const expected   = income - arrived;
  const totalSpent = expenseRows.reduce((s, e) => s + (e.amountUsd ?? 0), 0);
  const billsDueCount = upcomingBills.length;

  const { day: dayOfMonth, total: daysInMonth } = daysIntoMonth(new Date());
  const projected = projectedTotal(totalSpent, dayOfMonth, daysInMonth);

  // bills allocation = bills pct of income
  const billsAlloc = income * ((monthData.billsPct ?? 70) / 100);
  const obligated  = billsAlloc;
  const leftover   = Math.max(0, income - obligated);

  return (
    <div className="space-y-4">
      {/* header */}
      <div className="flex items-start justify-between gap-2 pb-1">
        <div className="min-w-0">
          <p className="text-[9px] font-bold tracking-[0.15em] uppercase text-muted-base">easyBudget</p>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Income</h1>
          <p className="text-xs text-muted-base mt-0.5">Track your earnings this month</p>
        </div>
        <MonthSwitcher year={year} month={month} />
      </div>

      <ContextStrip
        spent={totalSpent}
        projected={projected}
        income={income}
        billsDueCount={billsDueCount}
      />

      <IncomeHero total={income} arrived={arrived} expected={expected} />

      {/* entries list */}
      <IncomeEntryList entries={entries} />

      <GoesToCard obligated={obligated} leftover={leftover} />

      <IncomeForm monthId={monthData.id} />
    </div>
  );
}
