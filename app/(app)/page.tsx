import { getOrCreateMonth, getMonth } from "@/lib/actions/months";
import { seedDefaultTags } from "@/lib/actions/tags";
import { getExpensesForMonth, getRecentExpenses } from "@/lib/actions/expenses";
import { getUpcomingBills } from "@/lib/actions/bills";
import { getIncomeEntries, cleanupBackfilledPastEntries } from "@/lib/actions/income";
import { getDailySpend } from "@/lib/actions/trends";
import { currentYearMonth, calcIncomeTotals, formatMonth } from "@/lib/utils";
import { daysIntoMonth, projectedTotal, paceStatus } from "@/lib/actions/forecast";
import { TopBar } from "@/components/layout/top-bar";
import { TopTabs } from "@/components/layout/top-tabs";
import { ContextStrip } from "@/components/layout/context-strip";
import { MonthSwitcher } from "@/components/layout/month-switcher";
import { HeroAvailableCard } from "@/components/dashboard/hero-available-card";
import { AllocationGrid } from "@/components/dashboard/allocation-grid";
import { DailyPaceCard } from "@/components/dashboard/daily-pace-card";
import { RecentList } from "@/components/dashboard/recent-list";
import { UpcomingBillsStrip } from "@/components/dashboard/upcoming-bills-strip";
import { ExpensesTab } from "@/components/overview/expenses-tab";

const TABS = [
  { id: "today",       label: "Today"       },
  { id: "allocations", label: "Allocations" },
  { id: "dailyPace",   label: "Daily pace"  },
  { id: "expenses",    label: "Expenses"    },
];

function prevMonthCoords(year: number, month: number) {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; sub?: string }>;
}) {
  const params = await searchParams;
  await seedDefaultTags();
  await cleanupBackfilledPastEntries();

  const def   = currentYearMonth();
  const year  = parseInt(params.year  ?? String(def.year));
  const month = parseInt(params.month ?? String(def.month));
  const sub   = params.sub ?? "today";

  const monthData = await getOrCreateMonth(year, month);
  const last      = prevMonthCoords(year, month);
  const lastMonthData = await getMonth(last.year, last.month);

  const [expenseRows, upcomingBills, incomeEntries, dailySpendPoints, lastMonthExpenses, recentExpenses] =
    await Promise.all([
      getExpensesForMonth(monthData.id),
      getUpcomingBills(7),
      getIncomeEntries(monthData.id),
      getDailySpend(monthData.id, year, month),
      lastMonthData ? getExpensesForMonth(lastMonthData.id) : Promise.resolve([]),
      getRecentExpenses(monthData.id, 10),
    ]);

  const { budgetTotal, actualBalance } = calcIncomeTotals(incomeEntries);
  const income      = budgetTotal > 0 ? budgetTotal : (monthData.income ?? 0);
  const totalSpent  = expenseRows.reduce((s, e) => s + (e.amountUsd ?? 0), 0);
  const remaining   = Math.max(0, income - totalSpent);

  const { day: dayOfMonth, total: daysInMonth, pctThroughMonth } = daysIntoMonth(new Date());
  const projected  = projectedTotal(totalSpent, dayOfMonth, daysInMonth);
  const onTrack    = paceStatus(projected, income) === "good";

  // daily spend array (one value per day, index 0 = day 1)
  const dailySpend = dailySpendPoints.map((p) => p.total);

  // allocation buckets
  const byBucket = (bucket: string) =>
    expenseRows.filter((e) => e.bucket === bucket).reduce((s, e) => s + (e.amountUsd ?? 0), 0);

  // per-bucket daily pace → projected end-of-month
  const bucketExpected = (bucketSpent: number) =>
    dayOfMonth > 0 ? Math.round((bucketSpent / dayOfMonth) * daysInMonth) : bucketSpent;

  const buckets = [
    {
      key:      "savings" as const,
      name:     "Savings",
      pct:      monthData.savingsPct ?? 20,
      alloc:    income * ((monthData.savingsPct ?? 20) / 100),
      spent:    byBucket("savings"),
      expected: bucketExpected(byBucket("savings")),
    },
    {
      key:      "bills" as const,
      name:     "Bills",
      pct:      monthData.billsPct ?? 70,
      alloc:    income * ((monthData.billsPct ?? 70) / 100),
      spent:    byBucket("bills"),
      expected: bucketExpected(byBucket("bills")),
    },
    {
      key:      "wants" as const,
      name:     "Wants",
      pct:      monthData.wantsPct ?? 10,
      alloc:    income * ((monthData.wantsPct ?? 10) / 100),
      spent:    byBucket("wants"),
      expected: bucketExpected(byBucket("wants")),
    },
  ];

  // bills due this week count
  const billsDueCount = upcomingBills.length;

  // map expenses to RecentList shape
  const recentForList = recentExpenses.map((e) => ({
    id:       e.id,
    name:     e.description,
    tagName:  e.tagName,
    category: null,
    amount:   e.amountUsd ?? e.amount,
    date:     e.date,
  }));

  // map expenses to ExpensesTab shape
  const expensesForTab = recentExpenses.map((e) => ({
    id:            e.id,
    name:          e.description,
    tagName:       e.tagName,
    category:      null,
    amount:        e.amountUsd ?? e.amount,
    date:          e.date,
    paymentMethod: e.paymentMethod,
  }));

  const monthLabel = formatMonth(year, month);

  return (
    <div className="space-y-0">
      <div className="flex items-start justify-between gap-2 px-0 pt-0 pb-3">
        <div className="min-w-0">
          <p className="text-[9px] font-bold tracking-[0.15em] uppercase text-muted-base">easyBudget</p>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Overview</h1>
          <p className="text-xs text-muted-base mt-0.5">Day {dayOfMonth} of {daysInMonth} · {pctThroughMonth}% through month</p>
        </div>
        <MonthSwitcher year={year} month={month} />
      </div>

      <ContextStrip
        spent={totalSpent}
        projected={projected}
        income={income}
        billsDueCount={billsDueCount}
      />

      <div className="pt-1">
        <TopTabs tabs={TABS} />
      </div>

      <div className="pt-4 space-y-4">
        {sub === "today" && (
          <>
            <HeroAvailableCard
              remaining={remaining}
              total={income}
              spent={totalSpent}
              projected={projected}
              dayPct={pctThroughMonth}
              onTrack={onTrack}
            />
            <AllocationGrid buckets={buckets} />
            <DailyPaceCard
              dailySpend={dailySpend}
              daysInMonth={daysInMonth}
              dayOfMonth={dayOfMonth}
            />
            <UpcomingBillsStrip bills={upcomingBills} dayOfMonth={dayOfMonth} />
            <RecentList expenses={recentForList} />
          </>
        )}

        {sub === "allocations" && (
          <div className="py-2">
            <AllocationGrid buckets={buckets} />
          </div>
        )}

        {sub === "dailyPace" && (
          <DailyPaceCard
            dailySpend={dailySpend}
            daysInMonth={daysInMonth}
            dayOfMonth={dayOfMonth}
          />
        )}

        {sub === "expenses" && (
          <ExpensesTab expenses={expensesForTab} />
        )}
      </div>
    </div>
  );
}
