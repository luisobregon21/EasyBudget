import { getOrCreateMonth, getMonth } from "@/lib/actions/months";
import { getExpensesForMonth } from "@/lib/actions/expenses";
import { getIncomeEntries } from "@/lib/actions/income";
import {
  getMonthlyTrend, getExpensesByBucket, getTripSpend,
  getCategoryTrend, getDailySpend, getHeadlineInsight,
  type Range,
} from "@/lib/actions/trends";
import { currentYearMonth, calcIncomeTotals } from "@/lib/utils";
import { MonthSwitcher } from "@/components/layout/month-switcher";
import { HeroKpis } from "@/components/trends/hero-kpis";
import { Tabs } from "@/components/trends/tabs";
import { RangeToggle } from "@/components/trends/range-toggle";
import { MonthlyAreaChart } from "@/components/trends/monthly-area-chart";
import { HeadlineCard } from "@/components/trends/headline-card";
import { SpendTickerCard } from "@/components/trends/spend-ticker-card";
import { CategoryTickerTable } from "@/components/trends/category-ticker-table";
import { BiggestChangesCard } from "@/components/trends/biggest-changes-card";
import { BucketPulseBars } from "@/components/trends/bucket-pulse-bars";
import { DailyHeatmap } from "@/components/trends/daily-heatmap";
import { TripsList } from "@/components/trends/trips-list";

const VALID_RANGES: Range[] = ["6mo", "12mo", "ytd"];
const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTH_LABELS_SHORT = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];

function prevMonth(year: number, month: number): { year: number; month: number } {
  if (month === 1) return { year: year - 1, month: 12 };
  return { year, month: month - 1 };
}

export default async function TrendsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; range?: string }>;
}) {
  const params = await searchParams;
  const def    = currentYearMonth();
  const year   = parseInt(params.year  ?? String(def.year));
  const month  = parseInt(params.month ?? String(def.month));
  const range: Range = (VALID_RANGES.includes(params.range as Range) ? params.range : "6mo") as Range;

  const monthData = await getOrCreateMonth(year, month);
  const last = prevMonth(year, month);
  const lastMonthData = await getMonth(last.year, last.month);

  const incomeEntries = await getIncomeEntries(monthData.id);
  const { budgetTotal } = calcIncomeTotals(incomeEntries);
  const income = budgetTotal > 0 ? budgetTotal : monthData.income;

  const [expenseList, byBucket, byTrip, trend, categoryTrend, dailySpend, lastMonthExpenses] = await Promise.all([
    getExpensesForMonth(monthData.id),
    getExpensesByBucket(monthData.id, income),
    getTripSpend(monthData.id),
    getMonthlyTrend(range),
    getCategoryTrend(range, year, month),
    getDailySpend(monthData.id, year, month),
    lastMonthData ? getExpensesForMonth(lastMonthData.id) : Promise.resolve([]),
  ]);

  const totalSpent     = expenseList.reduce((s, e) => s + e.amountUsd, 0);
  const lastMonthSpent = lastMonthExpenses.reduce((s, e) => s + e.amountUsd, 0);
  const savings        = Math.max(0, income - totalSpent);
  const targetSpendPct = monthData.billsPct + monthData.wantsPct;

  const headline = await getHeadlineInsight(
    monthData.id, income, byBucket, totalSpent, lastMonthSpent,
    MONTH_LABELS[month - 1], MONTH_LABELS[last.month - 1],
  );
  const sparkline = trend.map((t) => t.spent);

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-foreground text-xl font-bold">Trends</h2>
          <p className="text-muted-base text-sm">Spending patterns and history</p>
        </div>
        <MonthSwitcher year={year} month={month} />
      </div>

      <HeroKpis spent={totalSpent} income={income} savings={savings} targetSpendPct={targetSpendPct} />

      <Tabs
        overview={
          <div className="space-y-5">
            <HeadlineCard text={headline} />
            <SpendTickerCard
              monthLabel={MONTH_LABELS_SHORT[month - 1]}
              lastMonthLabel={MONTH_LABELS[last.month - 1]}
              spent={totalSpent}
              lastMonthSpent={lastMonthSpent}
              sparkline={sparkline}
            />
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-foreground font-semibold text-sm">Income vs Spend over time</h3>
                <RangeToggle current={range} />
              </div>
              <div className="rounded-2xl bg-white/[0.03] border border-accent-purple/10 p-4">
                <MonthlyAreaChart data={trend} />
              </div>
            </section>
            <section className="space-y-3">
              <h3 className="text-foreground font-semibold text-sm">Daily spending — {MONTH_LABELS[month - 1]}</h3>
              <DailyHeatmap points={dailySpend} year={year} month={month} />
            </section>
            <section className="space-y-2">
              <h3 className="text-foreground font-semibold text-sm">Top categories</h3>
              <CategoryTickerTable rows={categoryTrend} limit={5} />
            </section>
          </div>
        }
        categories={
          <div className="space-y-5">
            <BiggestChangesCard rows={categoryTrend} />
            <section className="space-y-2">
              <h3 className="text-foreground font-semibold text-sm">By Bucket</h3>
              <BucketPulseBars buckets={byBucket} />
            </section>
            <section className="space-y-2">
              <h3 className="text-foreground font-semibold text-sm">All categories</h3>
              <CategoryTickerTable rows={categoryTrend} />
            </section>
          </div>
        }
        trips={
          <div className="space-y-5">
            <section className="space-y-2">
              <h3 className="text-foreground font-semibold text-sm">Active trips this month</h3>
              <TripsList trips={byTrip} />
            </section>
          </div>
        }
      />
    </div>
  );
}
