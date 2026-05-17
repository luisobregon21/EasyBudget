import { getOrCreateMonth, getMonth } from "@/lib/actions/months";
import { getExpensesForMonth } from "@/lib/actions/expenses";
import { getIncomeEntries } from "@/lib/actions/income";
import { getUpcomingBills } from "@/lib/actions/bills";
import {
  getMonthlyTrend, getExpensesByBucket, getTripSpend,
  getCategoryTrend, getDailySpend, getHeadlineInsight, getComparison,
  type Range, type CategoryView, type CompareUnit,
} from "@/lib/actions/trends";
import { currentYearMonth, calcIncomeTotals } from "@/lib/utils";
import { daysIntoMonth, projectedTotal } from "@/lib/actions/forecast";
import { ContextStrip } from "@/components/layout/context-strip";
import { TopTabs } from "@/components/layout/top-tabs";
import { MonthSwitcher } from "@/components/layout/month-switcher";
import { InsightCard } from "@/components/trends/insight-card";
import { ChartWithSwitcher } from "@/components/trends/chart-with-switcher";
import { CategoryTickerTable } from "@/components/trends/category-ticker-table";
import { CategoryViewToggle } from "@/components/trends/category-view-toggle";
import { BiggestChangesCard } from "@/components/trends/biggest-changes-card";
import { BucketPulseBars } from "@/components/trends/bucket-pulse-bars";
import { DailyHeatmap } from "@/components/trends/daily-heatmap";
import { CompareUnitToggle } from "@/components/trends/compare-unit-toggle";
import type { ComparisonResult, CategoryTrendRow } from "@/lib/actions/trends";

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
            categoryTrend={categoryTrend}
          />
        )}
      </div>
    </div>
  );
}

// ── Compare section ───────────────────────────────────────────────────────────

const fmtMoney = (n: number) =>
  "$" + Math.round(n).toLocaleString("en-US");

function CompareSection({
  comparison,
  compareUnit,
  categoryTrend,
}: {
  comparison: ComparisonResult;
  compareUnit: CompareUnit;
  categoryTrend: CategoryTrendRow[];
}) {
  const up      = comparison.currentSpent > comparison.previousSpent;
  const same    = comparison.currentSpent === comparison.previousSpent;
  const deltaAbs = Math.abs(comparison.deltaPct);
  const deltaColor = up ? "#f87171" : same ? "#8a7da8" : "#34d399";
  const deltaSign  = up ? "+" : same ? "" : "-";

  return (
    <div className="space-y-4">
      {/* unit toggle */}
      <CompareUnitToggle current={compareUnit} />

      {/* side-by-side cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {/* current period */}
        <div
          style={{
            background: "#181028",
            border: "1px solid rgba(167,139,250,0.18)",
            borderRadius: 14,
            padding: "14px 12px",
          }}
        >
          <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.8, color: "#5e5279", textTransform: "uppercase", marginBottom: 6 }}>
            {comparison.currentLabel}
          </p>
          <p
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "#ede9f6",
              fontFamily: "var(--font-geist-mono, monospace)",
              fontVariantNumeric: "tabular-nums",
              letterSpacing: -0.5,
            }}
          >
            {fmtMoney(comparison.currentSpent)}
          </p>
        </div>

        {/* previous period */}
        <div
          style={{
            background: "#13091f",
            border: "1px solid rgba(167,139,250,0.10)",
            borderRadius: 14,
            padding: "14px 12px",
          }}
        >
          <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.8, color: "#5e5279", textTransform: "uppercase", marginBottom: 6 }}>
            {comparison.previousLabel}
          </p>
          <p
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "#8a7da8",
              fontFamily: "var(--font-geist-mono, monospace)",
              fontVariantNumeric: "tabular-nums",
              letterSpacing: -0.5,
            }}
          >
            {fmtMoney(comparison.previousSpent)}
          </p>
        </div>
      </div>

      {/* delta chip */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            background: "rgba(255,255,255,0.04)",
            border: `1px solid ${deltaColor}33`,
            borderRadius: 999,
            padding: "5px 14px",
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 700, color: deltaColor, fontFamily: "var(--font-geist-mono, monospace)" }}>
            {deltaSign}{deltaAbs}%
          </span>
          <span style={{ fontSize: 10, color: "#8a7da8" }}>
            vs {comparison.previousLabel}
          </span>
        </div>
      </div>

      {/* biggest changes */}
      <BiggestChangesCard rows={categoryTrend} />
    </div>
  );
}
