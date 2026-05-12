# Trends Redesign — Design Spec (V2)

**Status:** Approved 2026-05-11
**Supersedes:** `2026-05-09-trends-page-design.md` (the first trends rebuild)
**Preview reference:** `/trends-preview/v5` (delete after ship)

## Why redesign again

The first trends rebuild crammed seven sections into one scrolling page with no visual hierarchy. Users got "everything is equal weight". This redesign reorganizes the same data + adds month-over-month signals using a tabbed, stock-market-inspired layout.

## Goal

Combine four content directions on one focused page:
1. **Tabbed layout** — Overview / Categories / Trips
2. **Persistent header**: month switcher + 3 KPI chips (Spent / Budget left / Saved)
3. **Stock-ticker visual language** — large numbers, up/down deltas, sparklines, monospace
4. **Motion-driven polish** via `motion@^12` (newly installed)

## Page layout

```
┌─ Persistent header ────────────────────────────────────┐
│ Trends                                  May 2026 ▾     │
│ Spent $1.9k │ Budget $4.5k left │ Saved $2k (21%)      │
│ [Overview] [Categories] [Trips]                        │
└────────────────────────────────────────────────────────┘
```

### Overview tab

1. **Headline insight card** — one auto-generated sentence in a gradient panel ("Spending down 79% vs April...")
2. **SPEND • {Month} ticker card** — large monospace dollar amount, ▲/▼ delta chip with $ + %, "vs {LastMonth}" caption, prominent sparkline on the right (160×72, contained in `w-40`)
3. **Income vs Spend area chart** — 6-month area chart with:
   - Range toggle (6mo / 12mo / YTD)
   - Y-axis $ labels with "nice" max rounding (`niceMax(rawMax)` → 1/2/5/10×10ⁿ)
   - Horizontal gridlines
   - X-axis month labels
4. **Daily spending calendar heatmap** for the current month
5. **Top 5 categories** ticker table (link to Categories tab)

### Categories tab

1. **Biggest changes vs last month** card — top 3 movers, each showing emoji, name, current value, ▲/▼ % chip
2. **By Bucket** with **animated pulse bars** using motion:
   - Bar fills from 0 → % on mount (0.8s ease-out)
   - Continuous breathing pulse: opacity 0.85↔1, pink box-shadow 4px↔18px, 1.8s loop
   - Honors `prefers-reduced-motion`
3. **All categories** ticker table — same component as Overview's "Top 5" but full list

### Trips tab

Active trips with budget bar + progress.

## Components to build (real components, not mock)

**Server actions** (extend `lib/actions/trends.ts`):
- Existing `getMonthlyTrend` already supplies the area chart data; add `bucketBreakdown` per month for stacked option later (not needed in V5).
- New `getCategoryTrend(range)` → returns each tag's: `name`, `emoji`, `currentTotal`, `lastMonthTotal`, `deltaPct`, `sparkline: number[]` (one value per month in range).
- New `getDailySpend(monthId)` → `{ day: number, total: number }[]` for the heatmap.
- New `getHeadlineInsight(monthId)` → string. Rule-based for now:
  - If spend > 1.5× last month: `"Spending up X% vs {Last}. {Bucket} is the biggest mover."`
  - Else if spend < 0.7× last month: `"Spending down X% vs {Last} — and you're Y% into your bills budget."`
  - Else if any bucket > 90% used: `"{Bucket} bucket is X% used — pace check."`
  - Else default: `"Spending steady. You've used X% of your monthly target."`

**Client components** (`components/trends/`):
- `Tabs` — local state, three buttons styled like the mockup
- `HeadlineCard` — server
- `SpendTickerCard` — server props, client Sparkline child
- `Sparkline` — pure SVG, padded inner-bounds (no overflow), accepts `up` to choose color
- `MonthlyAreaChart` — replaces `MonthlyTrendChart`; pure SVG area chart with Y-axis ticks, gridlines, X-axis labels (no Recharts — the mock proved SVG is enough and cleaner)
- `DailyHeatmap` — server
- `CategoryTickerTable` — server (used both in Overview "top 5" and Categories "all")
- `BiggestChangesCard` — server
- `BucketPulseBars` — **client** (motion)
- `TripsList` — server (lift from existing `TripBreakdown`)

**Atoms shared with the mock:** `Chip` (KPI), `TabBtn`, `SectionTitle`, `DeltaArrow` (▲/▼ with color).

## Files

```
app/(app)/trends/page.tsx                        # rewrite — orchestrator
app/(app)/trends-preview/**                      # DELETE entire route
components/trends/tabs.tsx                       # new (client)
components/trends/headline-card.tsx              # new
components/trends/spend-ticker-card.tsx          # new
components/trends/sparkline.tsx                  # new (client)
components/trends/monthly-area-chart.tsx         # new (replaces monthly-trend-chart.tsx)
components/trends/monthly-trend-chart.tsx        # DELETE (Recharts version)
components/trends/daily-heatmap.tsx              # new
components/trends/category-ticker-table.tsx      # new
components/trends/biggest-changes-card.tsx       # new
components/trends/bucket-pulse-bars.tsx          # new (client, uses motion)
components/trends/trips-list.tsx                 # new (lift from trip-breakdown)
components/trends/trip-breakdown.tsx             # DELETE (replaced by trips-list)
components/trends/bucket-breakdown.tsx           # DELETE (replaced by bucket-pulse-bars)
components/trends/tag-breakdown.tsx              # DELETE (replaced by category-ticker-table)
components/trends/payment-method-breakdown.tsx   # DELETE (no longer used — pmt is just a category)
components/trends/hero-kpis.tsx                  # UPDATE — new KPI labels (Spent/Budget/Saved)
components/trends/range-toggle.tsx               # KEEP
lib/actions/trends.ts                            # add getCategoryTrend, getDailySpend, getHeadlineInsight
package.json                                     # keep recharts? remove if nothing else uses it
```

**Recharts removal check:** Grep for other imports before removing — if nothing else uses it, drop the dep.

## Edge cases

- **No expenses this month** → Headline shows neutral default; SPEND ticker shows $0 with no delta arrow; heatmap shows all-empty; tickers show empty state per section.
- **No income** → Hero "Budget" chip shows "Set income to see target" linking to /income.
- **First-time user (no months)** → Each section gracefully empty; no errors.
- **Range with <2 months of data** → Area chart shows what we have; no zero-padding.
- **Tag deleted but used in past expenses** → tag joins as null, fall back to "Untagged".
- **prefers-reduced-motion** → All motion components honor it (`useReducedMotion()` from motion/react, OR `prefers-reduced-motion: reduce` media query inside the CSS animation classes for non-motion ones).

## Out of scope

- No drill-down (click a category → filter chart). Future.
- No CSV/PDF export.
- No custom date ranges.
- No category sparkline interactivity (hover values, etc.) — they're static visual cues.
- Categories tab does NOT show "By Payment Method" (the breakdown was redundant with categories). Payment method data is still captured in expenses; it just doesn't have its own tab section anymore.
