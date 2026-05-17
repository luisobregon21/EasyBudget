import { getOrCreateMonth, getMonth } from "@/lib/actions/months";
import { getExpensesForMonth } from "@/lib/actions/expenses";
import { getIncomeEntries } from "@/lib/actions/income";
import { getUpcomingBills } from "@/lib/actions/bills";
import {
  getMonthlyTrend, getExpensesByBucket, getTripSpend,
  getCategoryTrend, getDailySpend, getHeadlineInsight, getComparison,
  type Range, type CategoryView, type CompareUnit,
} from "@/lib/actions/trends";
import { currentYearMonth, calcIncomeTotals, formatCurrency } from "@/lib/utils";
import { daysIntoMonth, projectedTotal } from "@/lib/actions/forecast";
import { ContextStrip } from "@/components/layout/context-strip";
import { TopTabs } from "@/components/layout/top-tabs";
import { MonthSwitcher } from "@/components/layout/month-switcher";
import { InsightCard } from "@/components/trends/insight-card";
import { ChartWithSwitcher } from "@/components/trends/chart-with-switcher";
import { CategoryTickerTable } from "@/components/trends/category-ticker-table";
import { CategoryViewToggle } from "@/components/trends/category-view-toggle";
import { BucketPulseBars } from "@/components/trends/bucket-pulse-bars";
import { DailyHeatmap } from "@/components/trends/daily-heatmap";
import { CompareUnitToggle } from "@/components/trends/compare-unit-toggle";
import { StackedCompareBar } from "@/components/trends/stacked-compare-bar";
import { CompareBucketRows } from "@/components/trends/compare-bucket-rows";
import type { ComparisonResult } from "@/lib/actions/trends";

const VALID_RANGES: Range[] = ["6mo", "12mo", "ytd"];
const MONTH_LABELS       = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const TABS = [
  { id: "insights",   label: "Insights"   },
  { id: "categories", label: "Categories" },
  { id: "compare",    label: "Compare"    },
];

function prevMonthCoords(year: number, month: number) {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

const VALID_COMPARE_UNITS: CompareUnit[] = ["day", "month", "year"];

export default async function TrendsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; range?: string; categoryView?: string; sub?: string; compareUnit?: string }>;
}) {
  const params = await searchParams;
  const def    = currentYearMonth();
  const year   = parseInt(params.year  ?? String(def.year));
  const month  = parseInt(params.month ?? String(def.month));
  const sub    = params.sub ?? "insights";
  const range: Range = (VALID_RANGES.includes(params.range as Range) ? params.range : "6mo") as Range;
  const compareUnit: CompareUnit = (VALID_COMPARE_UNITS.includes(params.compareUnit as CompareUnit)
    ? params.compareUnit
    : "month") as CompareUnit;

  const categoryView: CategoryView =
    params.categoryView === "daily" ? "daily" : "monthly";

  const now = new Date();
  const selectedKey = year * 12 + month;
  const currentKey  = now.getFullYear() * 12 + (now.getMonth() + 1);
  const isFutureMonth = selectedKey > currentKey;
  const effectiveView: CategoryView = isFutureMonth ? "monthly" : categoryView;

  const monthData = await getOrCreateMonth(year, month);
  const last      = prevMonthCoords(year, month);
  const lastMonthData = await getMonth(last.year, last.month);

  const incomeEntries = await getIncomeEntries(monthData.id);
  const { budgetTotal } = calcIncomeTotals(incomeEntries);
  const income = budgetTotal > 0 ? budgetTotal : (monthData.income ?? 0);

  const [expenseList, byBucket, trend, categoryTrend, lastMonthExpenses, upcomingBills, dailySpend, comparison] = await Promise.all([
    getExpensesForMonth(monthData.id),
    getExpensesByBucket(monthData.id, income),
    getMonthlyTrend(range),
    getCategoryTrend(range, year, month, effectiveView),
    lastMonthData ? getExpensesForMonth(lastMonthData.id) : Promise.resolve([]),
    getUpcomingBills(7),
    getDailySpend(monthData.id, year, month),
    getComparison(compareUnit),
  ]);

  const totalSpent     = expenseList.reduce((s, e) => s + e.amountUsd, 0);
  const lastMonthSpent = lastMonthExpenses.reduce((s, e) => s + e.amountUsd, 0);
  const billsDueCount  = upcomingBills.length;

  const { day: dayOfMonth, total: daysInMonth } = daysIntoMonth(now);
  const projected = projectedTotal(totalSpent, dayOfMonth, daysInMonth);

  const headline = await getHeadlineInsight(
    monthData.id, income, byBucket, totalSpent, lastMonthSpent,
    MONTH_LABELS[month - 1], MONTH_LABELS[last.month - 1],
  );

  // Determine headline tone from text content
  const headlineTone: "good" | "bad" =
    headline.toLowerCase().includes("down") || headline.toLowerCase().includes("on track")
      ? "good"
      : "bad";

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {/* header */}
      <div className="flex items-start justify-between gap-2 pb-1">
        <div className="min-w-0">
          <p className="text-[9px] font-bold tracking-[0.15em] uppercase text-muted-base">easyBudget</p>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Trends</h1>
          <p className="text-xs text-muted-base mt-0.5">Spending patterns and history</p>
        </div>
        <MonthSwitcher year={year} month={month} />
      </div>

      <ContextStrip
        spent={totalSpent}
        projected={projected}
        income={income}
        billsDueCount={billsDueCount}
      />

      <TopTabs tabs={TABS} />

      <div className="pt-2 space-y-5">
        {/* ── Insights tab ─────────────────────────── */}
        {sub === "insights" && (
          <>
            <InsightCard text={headline} tone={headlineTone} />

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-foreground font-semibold text-sm">Income vs Spend over time</h3>
              </div>
              <ChartWithSwitcher data={trend} projected={!isFutureMonth ? projected : undefined} />
            </section>

            <section className="space-y-3">
              <h3 className="text-foreground font-semibold text-sm">Daily spending — {MONTH_LABELS[month - 1]}</h3>
              <DailyHeatmap points={dailySpend} year={year} month={month} />
            </section>

            <section className="space-y-2">
              <h3 className="text-foreground font-semibold text-sm">Top categories</h3>
              <CategoryTickerTable rows={categoryTrend} limit={5} />
            </section>
          </>
        )}

        {/* ── Categories tab ────────────────────────── */}
        {sub === "categories" && (
          <>
            <section className="space-y-2">
              <h3 className="text-foreground font-semibold text-sm">By Bucket</h3>
              <BucketPulseBars buckets={byBucket} />
            </section>
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-foreground font-semibold text-sm">All categories</h3>
                {!isFutureMonth && <CategoryViewToggle current={effectiveView} />}
              </div>
              <CategoryTickerTable rows={categoryTrend} />
            </section>
          </>
        )}

        {/* ── Compare tab ───────────────────────────── */}
        {sub === "compare" && (
          <CompareSection
            comparison={comparison}
            compareUnit={compareUnit}
          />
        )}
      </div>
    </div>
  );
}

// ── Compare section ───────────────────────────────────────────────────────────

function IncomeCompareCard({ comparison }: { comparison: ComparisonResult }) {
  return (
    <div className="rounded-2xl bg-white/[0.03] border border-accent-purple/13 p-4">
      <p className="text-muted-base text-[9px] uppercase tracking-widest font-bold">Income</p>
      <p className="text-foreground font-mono text-2xl font-black tabular-nums mt-1">
        {formatCurrency(comparison.currentArrived)}
      </p>
      {comparison.currentExpected > 0 && (
        <p className="text-muted-base text-[10px] font-mono mt-1">
          + {formatCurrency(comparison.currentExpected)} expected = {formatCurrency(comparison.currentIncome)} total
        </p>
      )}
      <p className="text-muted-base text-[10px] mt-1 font-mono">
        vs {comparison.previousLabel}: arrived {formatCurrency(comparison.previousArrived)}
        {comparison.previousExpected > 0 ? `, total ${formatCurrency(comparison.previousIncome)}` : ""}
      </p>
    </div>
  );
}

function SpendCompareCard({ comparison }: { comparison: ComparisonResult }) {
  const up = comparison.deltaPct > 0;
  const flat = comparison.deltaPct === 0 && comparison.currentSpent === comparison.previousSpent;
  return (
    <div className="rounded-2xl bg-white/[0.03] border border-accent-purple/13 p-4">
      <p className="text-muted-base text-[9px] uppercase tracking-widest font-bold">Spend</p>
      <p className="text-foreground font-mono text-2xl font-black tabular-nums mt-1">
        {formatCurrency(comparison.currentSpent)}
      </p>
      {!flat && (
        <p className={`text-xs font-mono font-bold mt-1 ${up ? "text-red-400" : "text-emerald-400"}`}>
          {up ? "▲" : "▼"} {Math.abs(comparison.deltaPct)}%
        </p>
      )}
      <p className="text-muted-base text-[10px] mt-1 font-mono">
        vs {comparison.previousLabel}: {formatCurrency(comparison.previousSpent)}
      </p>
    </div>
  );
}

function NetCompareCard({ comparison }: { comparison: ComparisonResult }) {
  const nowUp = comparison.netNowDeltaPct > 0;        // up is GOOD for net
  const flat  = comparison.netNowDeltaPct === 0 && comparison.currentNetNow === comparison.previousNet;
  const hasProjection = comparison.unit !== "day" && comparison.currentExpected > 0;
  return (
    <div className="rounded-2xl bg-white/[0.03] border border-accent-purple/13 p-4">
      <p className="text-muted-base text-[9px] uppercase tracking-widest font-bold">Net</p>
      <p className="text-foreground font-mono text-2xl font-black tabular-nums mt-1">
        {formatCurrency(comparison.currentNetNow)}
        <span className="text-muted-base text-[10px] font-normal ml-1">now</span>
      </p>
      {!flat && (
        <p className={`text-xs font-mono font-bold mt-1 ${nowUp ? "text-emerald-400" : "text-red-400"}`}>
          {nowUp ? "▲" : "▼"} {Math.abs(comparison.netNowDeltaPct)}%
        </p>
      )}
      {hasProjection && (
        <p className="text-muted-base text-[10px] mt-1 font-mono">
          Forecast: {formatCurrency(comparison.currentNetForecast)}
        </p>
      )}
      <p className="text-muted-base text-[10px] mt-1 font-mono">
        vs {comparison.previousLabel}: {formatCurrency(comparison.previousNet)}
      </p>
    </div>
  );
}

function CompareSection({
  comparison,
  compareUnit,
}: {
  comparison: ComparisonResult;
  compareUnit: CompareUnit;
}) {
  const currentBuckets = {
    savings: comparison.buckets.find((b) => b.bucket === "savings")?.current ?? 0,
    bills:   comparison.buckets.find((b) => b.bucket === "bills")?.current ?? 0,
    wants:   comparison.buckets.find((b) => b.bucket === "wants")?.current ?? 0,
  };
  const previousBuckets = {
    savings: comparison.buckets.find((b) => b.bucket === "savings")?.previous ?? 0,
    bills:   comparison.buckets.find((b) => b.bucket === "bills")?.previous ?? 0,
    wants:   comparison.buckets.find((b) => b.bucket === "wants")?.previous ?? 0,
  };

  return (
    <div className="space-y-4">
      <CompareUnitToggle current={compareUnit} />

      {/* Big 3 metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <IncomeCompareCard comparison={comparison} />
        <SpendCompareCard  comparison={comparison} />
        <NetCompareCard    comparison={comparison} />
      </div>

      {/* Stacked bar chart */}
      <StackedCompareBar
        currentLabel={comparison.currentLabel}
        previousLabel={comparison.previousLabel}
        current={currentBuckets}
        previous={previousBuckets}
      />

      {/* Bucket rows */}
      <CompareBucketRows
        buckets={comparison.buckets}
        previousLabel={comparison.previousLabel}
      />
    </div>
  );
}
