# Trends Page — Design Spec

**Status:** Approved 2026-05-09
**Owner:** EasyBudget

## Goal

Replace the current single-section Trends page (Payment Method only) with a combined dashboard that answers three questions:

1. **Am I on track this month?** (hero KPIs vs target)
2. **How am I doing over time?** (multi-month chart, toggleable range)
3. **Where is my money going?** (four "this month" breakdowns)

## Page Architecture

```
┌─ Header ────────────────────────────────────────────────┐
│ "Trends"                              [Month picker ▼]  │
└─────────────────────────────────────────────────────────┘

┌─ Hero KPIs (3 chips) ───────────────────────────────────┐
│  THIS MONTH   │   LAST MONTH    │   VS TARGET           │
│   $1,234      │     $1,580      │   -$120 under ✓       │
│   spent       │    spent        │   or +$240 over ✗     │
└─────────────────────────────────────────────────────────┘

**"Vs target" formula:** target spend = `month.income × (wantsPct + billsPct) / 100`.
Delta = `actualSpent - targetSpend`. Negative = under target (good, green).
Positive = over target (bad, red). If `month.income === 0`, KPI shows
"Set income to see target" with link to `/income`.

┌─ Multi-month chart  [6mo | 12mo | YTD] ────────────────┐
│  Grouped bars per month: income vs spend.              │
│  X-axis = month label, Y-axis = USD.                   │
│  Tooltip shows exact income, spend, savings rate.      │
└─────────────────────────────────────────────────────────┘

┌─ This-month breakdowns (mobile=stacked, desktop=2-col) ─┐
│  By Bucket               │  By Tag                      │
│  (savings/bills/wants     │  (top 5 tags w/ horiz bars,  │
│   vs allocation target)   │   "show all" expands)        │
├──────────────────────────┼──────────────────────────────┤
│  By Payment Method       │  By Trip                     │
│  (existing component)    │  (active trips, budget vs    │
│                          │   spent where budget exists) │
└─────────────────────────────────────────────────────────┘
```

Mobile is single-column. Desktop uses a 2-column CSS grid for the four breakdown cards.

## Components

### Server Components

- **`app/(app)/trends/page.tsx`** — orchestrator. Reads `searchParams.range` (default `"6mo"`), `searchParams.year`/`month` (default to current). Fetches all data in one `Promise.all`. Passes plain serializable data into client components.

### Client Components (`components/trends/`)

| Component | Responsibility | Inputs |
|-----------|----------------|--------|
| `HeroKpis` | Three chips: this month spend, last month spend, vs target | `{ thisMonth, lastMonth, target, actualSpent }` |
| `MonthlyTrendChart` | Recharts grouped bar chart, income vs spend per month | `{ data: TrendPoint[] }` |
| `RangeToggle` | Three pills (6mo / 12mo / YTD); pushes `?range=` to URL | `{ current: Range }` |
| `TagBreakdown` | Top 5 tags w/ horizontal bars; "show all" toggles full list | `{ tags: TagBreakdownRow[] }` |
| `BucketBreakdown` | Three cards (savings/bills/wants) with bar showing actual vs allocation | `{ buckets: BucketBreakdownRow[] }` |
| `TripBreakdown` | Per-trip row; progress bar when budget exists, running total otherwise | `{ trips: TripBreakdownRow[] }` |

The existing `getExpensesByPaymentMethod` data is rendered inline in the page (it already has a clean shape — no need for a wrapping client component).

### Server Actions (`lib/actions/trends.ts`, new file)

```ts
export type Range = "6mo" | "12mo" | "ytd";
export type TrendPoint = { year: number; month: number; label: string; income: number; spent: number; savedPct: number };
export type TagBreakdownRow = { tagId: number | null; name: string; emoji: string; total: number; pct: number };
export type BucketBreakdownRow = { bucket: "savings" | "bills" | "wants"; spent: number; allocated: number; pct: number };
export type TripBreakdownRow = { tripId: number; name: string; budgetUsd: number | null; spent: number };

export async function getMonthlyTrend(range: Range): Promise<TrendPoint[]>;
export async function getExpensesByTag(monthId: number): Promise<TagBreakdownRow[]>;
export async function getExpensesByBucket(monthId: number, year: number, month: number): Promise<BucketBreakdownRow[]>;
export async function getTripSpend(monthId: number): Promise<TripBreakdownRow[]>;
```

All actions call `requireSession()` and scope queries to `user.id`. Existing `getExpensesByPaymentMethod` and `getExpensesForMonth` are reused.

## Data Flow

1. URL determines view: `/trends?year=2026&month=5&range=6mo`.
2. Page fetches in parallel:
   - `getOrCreateMonth(year, month)` → monthData
   - Last month's `monthData` (for last-month KPI)
   - `getMonthlyTrend(range)`
   - `getExpensesForMonth(monthData.id)` (for total spent, hero)
   - `getExpensesByTag(monthData.id)`
   - `getExpensesByBucket(monthData.id, year, month)`
   - `getExpensesByPaymentMethod(monthData.id)` (existing)
   - `getTripSpend(monthData.id)`
3. Page assembles props and passes to components.
4. `RangeToggle` and `MonthSwitcher` mutate the URL via `router.push`, triggering server re-fetch.

## Edge Cases

- **No expenses this month** → each breakdown card shows its own empty state ("No tags yet", etc.); page is not blanked.
- **No income this month** → "vs target" KPI shows "Set income to see target" with link to `/income`.
- **Trip has no budget** → row shows running total only, no progress bar.
- **Range has <2 months of data** → chart renders what's available, no padding/zero bars.
- **Tag was deleted** → `tagId` is null, fall back to the row's `description` or label as `"Untagged"`.
- **No active trips and no trips with expenses this month** → trip card shows empty state.

## Library Choice — Recharts

Install `recharts` (~90KB gzipped). Chosen over CSS-only because:
- Need real X/Y axes with month labels.
- Need tooltips with multiple data points (income, spend, saved %).
- Future-friendly (sparklines, line charts) without re-architecting.

Chart components are wrapped in `"use client"`. The rest of the page stays server-rendered.

## Out of Scope (YAGNI)

- CSV/PDF export.
- Click-to-filter (tag bar → chart filtered to tag).
- Forecasting / projections.
- Benchmarks vs other users.
- Custom date ranges (only 6mo/12mo/YTD).

## File Structure

```
app/(app)/trends/page.tsx                 # rewrite (orchestrator)
components/trends/hero-kpis.tsx           # new
components/trends/monthly-trend-chart.tsx # new (client)
components/trends/range-toggle.tsx        # new (client)
components/trends/tag-breakdown.tsx       # new
components/trends/bucket-breakdown.tsx    # new
components/trends/trip-breakdown.tsx      # new
lib/actions/trends.ts                     # new
```
