import { getOrCreateMonth } from "@/lib/actions/months";
import { getExpensesForMonth, getExpensesByPaymentMethod } from "@/lib/actions/expenses";
import {
  getMonthlyTrend, getExpensesByTag, getExpensesByBucket, getTripSpend,
  type Range,
} from "@/lib/actions/trends";
import { currentYearMonth } from "@/lib/utils";
import { MonthSwitcher } from "@/components/layout/month-switcher";
import { HeroKpis } from "@/components/trends/hero-kpis";
import { RangeToggle } from "@/components/trends/range-toggle";
import { MonthlyTrendChart } from "@/components/trends/monthly-trend-chart";
import { BucketBreakdown } from "@/components/trends/bucket-breakdown";
import { TagBreakdown } from "@/components/trends/tag-breakdown";
import { TripBreakdown } from "@/components/trends/trip-breakdown";
import { PaymentMethodBreakdown } from "@/components/trends/payment-method-breakdown";

const VALID_RANGES: Range[] = ["6mo", "12mo", "ytd"];

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
  const lastMonthData = await getOrCreateMonth(last.year, last.month);

  const [expenseList, byMethod, byTag, byBucket, byTrip, trend, lastMonthExpenses] = await Promise.all([
    getExpensesForMonth(monthData.id),
    getExpensesByPaymentMethod(monthData.id),
    getExpensesByTag(monthData.id),
    getExpensesByBucket(monthData.id),
    getTripSpend(monthData.id),
    getMonthlyTrend(range),
    getExpensesForMonth(lastMonthData.id),
  ]);

  const totalSpent     = expenseList.reduce((s, e) => s + e.amountUsd, 0);
  const lastMonthSpent = lastMonthExpenses.reduce((s, e) => s + e.amountUsd, 0);
  const targetSpendPct = monthData.billsPct + monthData.wantsPct;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-foreground text-xl font-bold">Trends</h2>
          <p className="text-muted-base text-sm">Spending patterns and history</p>
        </div>
        <MonthSwitcher year={year} month={month} />
      </div>

      <HeroKpis
        thisMonthSpent={totalSpent}
        lastMonthSpent={lastMonthSpent}
        income={monthData.income}
        targetSpendPct={targetSpendPct}
      />

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-foreground font-semibold">Income vs Spend</h3>
          <RangeToggle current={range} />
        </div>
        <div className="rounded-2xl bg-white/[0.03] border border-accent-purple/10 p-3">
          <MonthlyTrendChart data={trend} />
        </div>
      </section>

      <div className="grid md:grid-cols-2 gap-6">
        <section className="space-y-3">
          <h3 className="text-foreground font-semibold">By Bucket</h3>
          <BucketBreakdown buckets={byBucket} />
        </section>

        <section className="space-y-3">
          <h3 className="text-foreground font-semibold">By Tag</h3>
          <TagBreakdown tags={byTag} />
        </section>

        <section className="space-y-3">
          <h3 className="text-foreground font-semibold">By Payment Method</h3>
          <PaymentMethodBreakdown rows={byMethod} totalSpent={totalSpent} />
        </section>

        <section className="space-y-3">
          <h3 className="text-foreground font-semibold">By Trip</h3>
          <TripBreakdown trips={byTrip} />
        </section>
      </div>
    </div>
  );
}
