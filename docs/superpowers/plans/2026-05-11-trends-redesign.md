# Trends Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Replace the current `/trends` page with the V5 design — tabbed Overview/Categories/Trips, stock-ticker visual language, motion-driven pulse bars, custom SVG charts (no Recharts).

**Architecture:** Server Component page orchestrates parallel fetches against `lib/actions/trends.ts`. Plain serializable data flows into mostly-server components, with `Tabs`, `Sparkline`, and `BucketPulseBars` as the only client components. Motion (`motion@^12.38.0`) drives the bucket bar pulse.

**Tech Stack:** Next.js 16 · React 19 · Drizzle · motion · Tailwind v4 · custom SVG (no Recharts)

**Spec:** [docs/superpowers/specs/2026-05-11-trends-redesign-design.md](docs/superpowers/specs/2026-05-11-trends-redesign-design.md)

**Reference mock:** `app/(app)/trends-preview/v5/page.tsx` — code is the visual source of truth. Lift the JSX patterns; replace hardcoded SEED with real props.

**Verification:** No test runner in this repo. Each task ends with `npx tsc --noEmit` (zero output) + commit. The orchestrator task at the end also runs `npx next build`.

---

## Task 1: Add new server actions (`getCategoryTrend`, `getDailySpend`, `getHeadlineInsight`)

**Files:** Modify `lib/actions/trends.ts` (append; do not edit existing actions)

- [ ] **Step 1: Add types + `getCategoryTrend`**

Add these types at the top of the file (after existing types):

```ts
export type CategoryTrendRow = {
  tagId: number | null;
  name: string;
  emoji: string;
  currentTotal: number;
  lastMonthTotal: number;
  deltaPct: number;        // 0 if last was 0 and current is 0; +100 if last was 0 and current > 0
  sparkline: number[];     // one value per month in range, oldest → newest
};

export type DailySpendPoint = { day: number; total: number };
```

Append at end of file:

```ts
export async function getCategoryTrend(range: Range): Promise<CategoryTrendRow[]> {
  const user = await requireSession();
  const db = getDb();
  const now = new Date();
  const { year: startYear, month: startMonth } = rangeStart(range, now);

  // Pull all months in range for this user
  const monthRows = await db.select({ id: months.id, year: months.year, month: months.month })
    .from(months)
    .where(and(
      eq(months.userId, user.id!),
      sql`${months.year} * 12 + ${months.month} >= ${startYear * 12 + startMonth}`,
    ))
    .orderBy(months.year, months.month);
  if (monthRows.length === 0) return [];
  const monthIds = monthRows.map((m) => m.id);

  // Sum by (tagId, monthId) once
  const rows = await db.select({
    tagId:    expenses.tagId,
    monthId:  expenses.monthId,
    tagName:  tags.name,
    tagEmoji: tags.emoji,
    total:    sql<number>`sum(${expenses.amountUsd})`,
  })
    .from(expenses)
    .leftJoin(tags, eq(expenses.tagId, tags.id))
    .where(and(eq(expenses.userId, user.id!), inArray(expenses.monthId, monthIds)))
    .groupBy(expenses.tagId, expenses.monthId, tags.name, tags.emoji);

  // Pivot to per-tag sparklines
  type Bucket = { tagId: number | null; name: string; emoji: string; byMonth: Map<number, number> };
  const buckets = new Map<string, Bucket>();
  for (const r of rows) {
    const key = `${r.tagId ?? "null"}|${r.tagName ?? "Untagged"}`;
    let b = buckets.get(key);
    if (!b) {
      b = { tagId: r.tagId, name: r.tagName ?? "Untagged", emoji: r.tagEmoji ?? "🏷️", byMonth: new Map() };
      buckets.set(key, b);
    }
    b.byMonth.set(r.monthId, Number(r.total));
  }

  const currentMonthId = monthRows[monthRows.length - 1].id;
  const lastMonthId    = monthRows.length >= 2 ? monthRows[monthRows.length - 2].id : null;

  const result: CategoryTrendRow[] = [];
  for (const b of buckets.values()) {
    const sparkline = monthRows.map((m) => b.byMonth.get(m.id) ?? 0);
    const currentTotal   = b.byMonth.get(currentMonthId) ?? 0;
    const lastMonthTotal = lastMonthId !== null ? (b.byMonth.get(lastMonthId) ?? 0) : 0;
    let deltaPct = 0;
    if (lastMonthTotal === 0 && currentTotal > 0) deltaPct = 100;
    else if (lastMonthTotal > 0) deltaPct = Math.round(((currentTotal - lastMonthTotal) / lastMonthTotal) * 100);
    result.push({ tagId: b.tagId, name: b.name, emoji: b.emoji, currentTotal, lastMonthTotal, deltaPct, sparkline });
  }
  return result.sort((a, b) => b.currentTotal - a.currentTotal);
}

export async function getDailySpend(monthId: number, year: number, month: number): Promise<DailySpendPoint[]> {
  const user = await requireSession();
  const db = getDb();

  const rows = await db.select({
    date:  expenses.date,
    total: sql<number>`sum(${expenses.amountUsd})`,
  })
    .from(expenses)
    .where(and(eq(expenses.monthId, monthId), eq(expenses.userId, user.id!)))
    .groupBy(expenses.date);

  const daysInMonth = new Date(year, month, 0).getDate(); // month is 1-indexed; this gives last day
  const byDay = new Map<number, number>();
  for (const r of rows) {
    const day = parseInt(r.date.split("-")[2]);
    byDay.set(day, (byDay.get(day) ?? 0) + Number(r.total));
  }
  return Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1, total: byDay.get(i + 1) ?? 0 }));
}

export async function getHeadlineInsight(
  monthId: number,
  income: number,
  buckets: BucketBreakdownRow[],
  thisMonthSpent: number,
  lastMonthSpent: number,
  monthLabel: string,
  lastMonthLabel: string,
): Promise<string> {
  // Ratio of this month vs last; guard against /0.
  if (lastMonthSpent > 0) {
    const ratio = thisMonthSpent / lastMonthSpent;
    const pct = Math.abs(Math.round(((thisMonthSpent - lastMonthSpent) / lastMonthSpent) * 100));
    if (ratio > 1.5) {
      const biggest = [...buckets].sort((a, b) => b.spent - a.spent)[0];
      const which = biggest ? biggest.bucket[0].toUpperCase() + biggest.bucket.slice(1) : "Spending";
      return `Spending up ${pct}% vs ${lastMonthLabel}. ${which} is the biggest mover.`;
    }
    if (ratio < 0.7) {
      const bills = buckets.find((b) => b.bucket === "bills");
      const billsPct = bills ? bills.pct : 0;
      return `Spending down ${pct}% vs ${lastMonthLabel} — and you're ${billsPct}% into your bills budget.`;
    }
  }
  const hotBucket = buckets.find((b) => b.pct >= 90);
  if (hotBucket) {
    const label = hotBucket.bucket[0].toUpperCase() + hotBucket.bucket.slice(1);
    return `${label} bucket is ${hotBucket.pct}% used — pace check.`;
  }
  if (income > 0) {
    const targetPct = Math.round((thisMonthSpent / income) * 100);
    return `Spending steady. You've used ${targetPct}% of your monthly income.`;
  }
  return `${monthLabel} is just getting started. Add income and expenses to see trends.`;
}
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: zero output.

- [ ] **Step 3: Commit**

```bash
git add lib/actions/trends.ts
git commit -m "$(cat <<'EOF'
feat(trends): add getCategoryTrend, getDailySpend, getHeadlineInsight actions

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Shared `Sparkline` client component

**Files:** Create `components/trends/sparkline.tsx`

- [ ] **Step 1: Create component (lift from v5 mock exactly)**

```tsx
"use client";

interface Props {
  values: number[];
  up: boolean;
  width: number;
  height: number;
  thick?: boolean;
}

export function Sparkline({ values, up, width, height, thick }: Props) {
  if (values.length === 0) return null;
  const max = Math.max(...values) || 1;
  const min = Math.min(...values);
  const range = max - min || 1;
  const pad = thick ? 3 : 2;
  const innerH = height - pad * 2;
  const step = values.length === 1 ? 0 : width / (values.length - 1);
  const points = values.map((v, i) => [i * step, pad + innerH - ((v - min) / range) * innerH]);
  const color = up ? "#f87171" : "#34d399";
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = path + ` L${width},${height} L0,${height} Z`;
  const gradId = `sparkline-${width}-${height}-${up ? "up" : "down"}`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full block" preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <path d={path} fill="none" stroke={color} strokeWidth={thick ? 2.5 : 1.5} />
    </svg>
  );
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
npx tsc --noEmit
git add components/trends/sparkline.tsx
git commit -m "feat(trends): shared Sparkline component (replaces inline copies)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: `MonthlyAreaChart` (replaces Recharts version)

**Files:**
- Create `components/trends/monthly-area-chart.tsx`
- Delete `components/trends/monthly-trend-chart.tsx`

- [ ] **Step 1: Create the new chart (lift from v5 mock — already has Y-axis, gridlines, nice ticks)**

```tsx
"use client";
import type { TrendPoint } from "@/lib/actions/trends";

interface Props {
  data: TrendPoint[];
}

function formatTick(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  if (n === 0) return "$0";
  return `$${Math.round(n)}`;
}

function niceMax(raw: number): number {
  if (raw <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const ratio = raw / pow;
  if (ratio <= 1) return pow;
  if (ratio <= 2) return 2 * pow;
  if (ratio <= 5) return 5 * pow;
  return 10 * pow;
}

export function MonthlyAreaChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <p className="text-muted-base text-sm text-center py-8">
        Not enough data for a trend yet. Add income and expenses to see your history.
      </p>
    );
  }
  const rawMax = Math.max(...data.map((d) => Math.max(d.income, d.spent))) || 1;
  const max = niceMax(rawMax);
  const w = 600, h = 180;
  const padL = 44, padR = 8, padT = 8, padB = 22;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;
  const step = data.length === 1 ? 0 : plotW / (data.length - 1);
  const ticks = [0, max / 4, max / 2, (3 * max) / 4, max];
  const x = (i: number) => padL + i * step;
  const y = (v: number) => padT + plotH - (v / max) * plotH;
  const incomePath = data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d.income).toFixed(1)}`).join(" ");
  const spendPath  = data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d.spent).toFixed(1)}`).join(" ");
  const baseY = padT + plotH;
  const incomeArea = incomePath + ` L${padL + plotW},${baseY} L${padL},${baseY} Z`;
  const spendArea  = spendPath  + ` L${padL + plotW},${baseY} L${padL},${baseY} Z`;
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full block">
        <defs>
          <linearGradient id="area-income" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="area-spend" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ec4899" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#ec4899" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t, i) => {
          const ty = y(t);
          return (
            <g key={i}>
              <line x1={padL} x2={w - padR} y1={ty} y2={ty} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
              <text x={padL - 6} y={ty + 3} textAnchor="end" fontSize="9" fill="#a78bfa">{formatTick(t)}</text>
            </g>
          );
        })}
        <path d={incomeArea} fill="url(#area-income)" />
        <path d={spendArea} fill="url(#area-spend)" />
        <path d={incomePath} fill="none" stroke="#fbbf24" strokeWidth="2" />
        <path d={spendPath}  fill="none" stroke="#ec4899" strokeWidth="2" />
        {data.map((d, i) => (
          <text key={d.label + i} x={x(i)} y={h - 6} textAnchor="middle" fontSize="9" fill="#a78bfa">{d.label}</text>
        ))}
      </svg>
      <div className="flex gap-3 mt-2 text-[10px] text-muted-base">
        <span className="flex items-center gap-1.5"><span className="w-3 h-1 bg-amber-400" />Income</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-1 bg-pink-500" />Spent</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Delete old Recharts version**

```bash
rm components/trends/monthly-trend-chart.tsx
```

- [ ] **Step 3: Typecheck + commit**

```bash
npx tsc --noEmit
git add components/trends/monthly-area-chart.tsx components/trends/monthly-trend-chart.tsx
git commit -m "feat(trends): replace Recharts bar chart with custom SVG area chart

Custom SVG removes the ~90KB Recharts dependency, gives us Y-axis labels
out of the box, and matches the V5 design exactly.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: `BucketPulseBars` (motion-driven)

**Files:**
- Create `components/trends/bucket-pulse-bars.tsx`
- Delete `components/trends/bucket-breakdown.tsx`

- [ ] **Step 1: Create the motion component**

```tsx
"use client";
import { motion, useReducedMotion } from "motion/react";
import { formatCurrency } from "@/lib/utils";
import type { BucketBreakdownRow } from "@/lib/actions/trends";

const STYLES: Record<BucketBreakdownRow["bucket"], { label: string; emoji: string; gradient: string }> = {
  savings: { label: "Savings",  emoji: "💰", gradient: "from-amber-400 to-pink-500" },
  bills:   { label: "Bills",    emoji: "🏦", gradient: "from-pink-500 to-pink-400" },
  wants:   { label: "Personal", emoji: "✨", gradient: "from-violet-500 to-violet-400" },
};

interface Props {
  buckets: BucketBreakdownRow[];
}

export function BucketPulseBars({ buckets }: Props) {
  const reduced = useReducedMotion();

  if (buckets.length === 0 || buckets.every((b) => b.spent === 0 && b.allocated === 0)) {
    return <p className="text-muted-base text-sm text-center py-8">Set income to enable budget tracking.</p>;
  }

  return (
    <div className="rounded-2xl bg-white/[0.03] border border-accent-purple/10 divide-y divide-white/5">
      {buckets.map((b) => {
        const s = STYLES[b.bucket];
        const over = b.pct > 100;
        const fill = Math.min(b.pct, 100);
        const gradient = over ? "from-red-500 to-red-400" : s.gradient;
        return (
          <div key={b.bucket} className="p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-foreground font-semibold text-sm">
                <span>{s.emoji}</span>{s.label}
              </span>
              <span className={`text-xs font-bold ${over ? "text-red-400" : "text-foreground"}`}>
                {formatCurrency(b.spent)} / {formatCurrency(b.allocated)}
              </span>
            </div>
            <div className="relative h-2.5 rounded-full bg-white/[0.08]">
              <motion.div
                className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${gradient}`}
                initial={reduced ? { width: `${fill}%` } : { width: 0, opacity: 0.85 }}
                animate={
                  reduced
                    ? { width: `${fill}%` }
                    : {
                        width: `${fill}%`,
                        opacity: [0.85, 1, 0.85],
                        boxShadow: [
                          "0 0 4px 0 rgba(236, 72, 153, 0.4)",
                          "0 0 18px 3px rgba(236, 72, 153, 0.85)",
                          "0 0 4px 0 rgba(236, 72, 153, 0.4)",
                        ],
                      }
                }
                transition={{
                  width: { duration: 0.8, ease: "easeOut" },
                  opacity: { duration: 1.8, repeat: Infinity, ease: "easeInOut" },
                  boxShadow: { duration: 1.8, repeat: Infinity, ease: "easeInOut" },
                }}
              />
            </div>
            <p className="text-muted-base text-[10px] text-right">{b.pct}% used</p>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Delete old bucket breakdown**

```bash
rm components/trends/bucket-breakdown.tsx
```

- [ ] **Step 3: Typecheck + commit**

```bash
npx tsc --noEmit
git add components/trends/bucket-pulse-bars.tsx components/trends/bucket-breakdown.tsx
git commit -m "feat(trends): motion-driven BucketPulseBars (replaces static bars)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Headline, SpendTicker, CategoryTickerTable, BiggestChanges, DailyHeatmap, TripsList

**Files:** Six new server components in `components/trends/`. All are lifts from the V5 mock with hardcoded SEED replaced by props.

- [ ] **Step 1: Create `headline-card.tsx`**

```tsx
interface Props {
  text: string;
}

export function HeadlineCard({ text }: Props) {
  return (
    <section className="rounded-2xl bg-gradient-to-br from-violet-900/40 to-bg-deep border border-accent-purple/30 p-5">
      <p className="text-accent-gold text-[10px] uppercase tracking-widest font-bold mb-1">Headline</p>
      <p className="text-foreground text-xl font-bold leading-snug">{text}</p>
    </section>
  );
}
```

- [ ] **Step 2: Create `spend-ticker-card.tsx`**

```tsx
import { formatCurrency } from "@/lib/utils";
import { Sparkline } from "./sparkline";

interface Props {
  monthLabel: string;          // "MAY"
  lastMonthLabel: string;      // "April"
  spent: number;
  lastMonthSpent: number;
  sparkline: number[];         // monthly spend over the visible range
}

export function SpendTickerCard({ monthLabel, lastMonthLabel, spent, lastMonthSpent, sparkline }: Props) {
  const delta = spent - lastMonthSpent;
  const deltaPct = lastMonthSpent > 0 ? Math.round((delta / lastMonthSpent) * 100) : 0;
  const up = delta > 0;
  return (
    <section className="rounded-2xl bg-white/[0.03] border border-accent-purple/10 p-5 overflow-hidden">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-muted-base text-[10px] uppercase tracking-widest font-semibold">SPEND • {monthLabel}</p>
          <p className="text-foreground text-3xl font-black mt-1 font-mono tabular-nums">{formatCurrency(spent)}</p>
          {lastMonthSpent > 0 && (
            <p className={`text-xs font-bold font-mono mt-1.5 ${up ? "text-red-400" : "text-green-400"}`}>
              {up ? "▲" : "▼"} {formatCurrency(Math.abs(delta))} ({deltaPct > 0 ? "+" : ""}{deltaPct}%)
              <span className="text-muted-base font-normal ml-2">vs {lastMonthLabel}</span>
            </p>
          )}
        </div>
        <div className="w-40 shrink-0">
          <Sparkline values={sparkline} up={up} width={160} height={72} thick />
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Create `category-ticker-table.tsx`**

```tsx
import { formatCurrency } from "@/lib/utils";
import { Sparkline } from "./sparkline";
import type { CategoryTrendRow } from "@/lib/actions/trends";

interface Props {
  rows: CategoryTrendRow[];
  limit?: number;  // if set, only show top N
}

export function CategoryTickerTable({ rows, limit }: Props) {
  if (rows.length === 0) {
    return <p className="text-muted-base text-sm text-center py-8">No tagged expenses this month.</p>;
  }
  const visible = limit ? rows.slice(0, limit) : rows;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[9px] uppercase tracking-widest text-muted-base font-bold px-1">
        <span>Category</span>
        <div className="flex gap-6">
          <span className="w-20 text-right">Last</span>
          <span className="w-16 text-right">Change</span>
          <span className="w-24 text-right">Trend</span>
        </div>
      </div>
      <div className="rounded-2xl bg-white/[0.03] border border-accent-purple/10 divide-y divide-white/5">
        {visible.map((t) => {
          const up = t.deltaPct > 0;
          const flat = t.deltaPct === 0;
          return (
            <div key={`${t.tagId ?? "null"}-${t.name}`} className="px-4 py-3 flex items-center gap-3">
              <span className="text-lg">{t.emoji}</span>
              <p className="flex-1 text-foreground font-medium text-sm font-mono">{t.name.toUpperCase()}</p>
              <div className="flex items-center gap-6">
                <p className="w-20 text-right text-foreground text-sm font-mono tabular-nums font-bold">
                  {formatCurrency(t.currentTotal)}
                </p>
                <p className={`w-16 text-right text-xs font-mono font-bold ${
                  flat ? "text-muted-base" : up ? "text-red-400" : "text-green-400"
                }`}>
                  {flat ? "—" : `${up ? "▲" : "▼"} ${Math.abs(t.deltaPct)}%`}
                </p>
                <div className="w-24 flex justify-end">
                  <Sparkline values={t.sparkline} up={up} width={84} height={24} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create `biggest-changes-card.tsx`**

```tsx
import { formatCurrency } from "@/lib/utils";
import type { CategoryTrendRow } from "@/lib/actions/trends";

interface Props {
  rows: CategoryTrendRow[];
}

export function BiggestChangesCard({ rows }: Props) {
  const movers = [...rows]
    .filter((r) => r.deltaPct !== 0)
    .sort((a, b) => Math.abs(b.deltaPct) - Math.abs(a.deltaPct))
    .slice(0, 3);
  if (movers.length === 0) return null;
  return (
    <section className="space-y-2">
      <h3 className="text-foreground font-semibold text-sm">Biggest changes vs last month</h3>
      <div className="rounded-2xl bg-white/[0.03] border border-accent-purple/10 divide-y divide-white/5">
        {movers.map((c) => {
          const up = c.deltaPct > 0;
          return (
            <div key={`${c.tagId ?? "null"}-${c.name}`} className="p-3 flex items-center gap-3">
              <span className="text-xl">{c.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-foreground text-sm font-medium">{c.name}</p>
                <p className="text-muted-base text-[10px]">Now {formatCurrency(c.currentTotal)}</p>
              </div>
              <p className={`text-sm font-bold font-mono ${up ? "text-red-400" : "text-green-400"}`}>
                {up ? "▲" : "▼"} {Math.abs(c.deltaPct)}%
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Create `daily-heatmap.tsx`**

```tsx
import { formatCurrency } from "@/lib/utils";
import type { DailySpendPoint } from "@/lib/actions/trends";

interface Props {
  points: DailySpendPoint[];
  year: number;
  month: number;  // 1-indexed
}

export function DailyHeatmap({ points, year, month }: Props) {
  const startWeekday = new Date(year, month - 1, 1).getDay();
  const max = Math.max(...points.map((p) => p.total)) || 1;

  const cells: ({ day: number; value: number } | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  points.forEach((p) => cells.push({ day: p.day, value: p.total }));
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="rounded-2xl bg-white/[0.03] border border-accent-purple/10 p-4">
      <div className="grid grid-cols-7 gap-1 text-center text-[9px] text-muted-base mb-1">
        {["S","M","T","W","T","F","S"].map((d, i) => <span key={i}>{d}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((c, i) => {
          if (!c) return <span key={i} className="w-full aspect-square rounded-sm bg-transparent" />;
          const alpha = c.value > 0 ? 0.1 + (c.value / max) * 0.9 : 0;
          return (
            <div
              key={i}
              className="w-full aspect-square rounded-sm flex items-center justify-center text-[8px] text-foreground/60"
              style={{ background: c.value > 0 ? `rgba(236, 72, 153, ${alpha})` : "rgba(255,255,255,0.03)" }}
              title={`Day ${c.day}: ${formatCurrency(c.value)}`}
            >
              {c.day}
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between mt-3 text-[10px] text-muted-base">
        <span>Less</span>
        <div className="flex gap-1">
          {[0.1, 0.3, 0.55, 0.8, 1].map((a, i) => (
            <span key={i} className="w-3 h-3 rounded-sm" style={{ background: `rgba(236, 72, 153, ${a})` }} />
          ))}
        </div>
        <span>More</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Create `trips-list.tsx`**

```tsx
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import type { TripBreakdownRow } from "@/lib/actions/trends";

interface Props {
  trips: TripBreakdownRow[];
}

export function TripsList({ trips }: Props) {
  if (trips.length === 0) {
    return <p className="text-muted-base text-sm text-center py-8">No trip spending this month.</p>;
  }
  return (
    <div className="rounded-2xl bg-white/[0.03] border border-accent-purple/10 divide-y divide-white/5">
      {trips.map((t) => {
        const pct  = t.budgetUsd && t.budgetUsd > 0 ? Math.round((t.spent / t.budgetUsd) * 100) : null;
        const over = pct !== null && pct > 100;
        const fill = pct !== null ? Math.min(pct, 100) : 0;
        return (
          <Link key={t.tripId} href={`/trips/${t.tripId}`} className="block p-4 hover:bg-white/[0.02]">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-foreground font-semibold text-sm">
                <span>✈️</span>{t.name}
              </span>
              <span className={`text-sm font-bold ${over ? "text-red-400" : "text-cyan-400"}`}>
                {formatCurrency(t.spent)}
                {t.budgetUsd ? <span className="text-muted-base font-normal"> / {formatCurrency(t.budgetUsd)}</span> : null}
              </span>
            </div>
            {pct !== null && (
              <>
                <div className="mt-2 h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${over ? "from-red-500 to-red-400" : "from-cyan-400 to-cyan-500"}`}
                    style={{ width: `${fill}%` }}
                  />
                </div>
                <p className="text-muted-base text-[10px] mt-0.5 text-right">{pct}%</p>
              </>
            )}
          </Link>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 7: Delete old tag/trip/payment-method breakdown files**

```bash
rm components/trends/tag-breakdown.tsx
rm components/trends/trip-breakdown.tsx
rm components/trends/payment-method-breakdown.tsx
```

- [ ] **Step 8: Typecheck + commit**

```bash
npx tsc --noEmit
git add components/trends/headline-card.tsx components/trends/spend-ticker-card.tsx components/trends/category-ticker-table.tsx components/trends/biggest-changes-card.tsx components/trends/daily-heatmap.tsx components/trends/trips-list.tsx components/trends/tag-breakdown.tsx components/trends/trip-breakdown.tsx components/trends/payment-method-breakdown.tsx
git commit -m "feat(trends): six new presentation components (headline, ticker card, category table, biggest changes, heatmap, trips); remove old breakdown components

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: `Tabs` client component + updated `HeroKpis`

**Files:**
- Create `components/trends/tabs.tsx`
- Update `components/trends/hero-kpis.tsx`

- [ ] **Step 1: Create Tabs**

```tsx
"use client";
import { useState } from "react";

export type TabId = "overview" | "categories" | "trips";

interface Props {
  overview: React.ReactNode;
  categories: React.ReactNode;
  trips: React.ReactNode;
}

export function Tabs({ overview, categories, trips }: Props) {
  const [tab, setTab] = useState<TabId>("overview");
  return (
    <>
      <div className="flex gap-1 rounded-xl bg-white/[0.04] border border-accent-purple/20 p-1">
        <TabBtn label="Overview"   active={tab === "overview"}   onClick={() => setTab("overview")} />
        <TabBtn label="Categories" active={tab === "categories"} onClick={() => setTab("categories")} />
        <TabBtn label="Trips"      active={tab === "trips"}      onClick={() => setTab("trips")} />
      </div>
      <div className="mt-5">
        {tab === "overview" && overview}
        {tab === "categories" && categories}
        {tab === "trips" && trips}
      </div>
    </>
  );
}

function TabBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 px-3 py-2 text-sm font-semibold rounded-lg transition-colors ${
        active ? "bg-accent-purple text-white" : "text-muted-base hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}
```

- [ ] **Step 2: Update HeroKpis to new labels (Spent / Budget / Saved)**

Replace `components/trends/hero-kpis.tsx` entirely:

```tsx
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

interface Props {
  spent: number;
  income: number;
  savings: number;          // income - spent (clamped at 0)
  targetSpendPct: number;   // billsPct + wantsPct
}

function Chip({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "good" | "bad" }) {
  const toneClass = tone === "good" ? "text-green-400" : tone === "bad" ? "text-red-400" : "text-foreground";
  return (
    <div className="rounded-2xl bg-white/[0.03] border border-accent-purple/10 p-4">
      <p className="text-muted-base text-[9px] uppercase tracking-widest font-semibold">{label}</p>
      <p className={`text-lg font-black ${toneClass} mt-1`}>{value}</p>
      {sub && <p className="text-muted-base text-[10px] mt-0.5">{sub}</p>}
    </div>
  );
}

export function HeroKpis({ spent, income, savings, targetSpendPct }: Props) {
  const target = income * (targetSpendPct / 100);
  const delta = spent - target;

  let budgetChip;
  if (income === 0) {
    budgetChip = (
      <div className="rounded-2xl bg-white/[0.03] border border-accent-purple/10 p-4">
        <p className="text-muted-base text-[9px] uppercase tracking-widest font-semibold">Budget</p>
        <Link href="/income" className="text-sm text-accent-gold underline mt-1 block">Set income</Link>
      </div>
    );
  } else if (delta <= 0) {
    budgetChip = <Chip label="Budget" value={formatCurrency(Math.abs(delta))} sub="left to spend" tone="good" />;
  } else {
    budgetChip = <Chip label="Budget" value={formatCurrency(delta)} sub="over budget" tone="bad" />;
  }

  const savedPct = income > 0 ? Math.round((savings / income) * 100) : 0;
  return (
    <div className="grid grid-cols-3 gap-3">
      <Chip label="Spent" value={formatCurrency(spent)} sub="this month" />
      {budgetChip}
      <Chip label="Saved" value={formatCurrency(savings)} sub={income > 0 ? `${savedPct}% of income` : "—"} tone="good" />
    </div>
  );
}
```

- [ ] **Step 3: Typecheck + commit**

```bash
npx tsc --noEmit
git add components/trends/tabs.tsx components/trends/hero-kpis.tsx
git commit -m "feat(trends): Tabs client component + updated HeroKpis (Spent/Budget/Saved)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Rewrite `/trends` page as orchestrator

**Files:** Overwrite `app/(app)/trends/page.tsx`

- [ ] **Step 1: Replace file**

```tsx
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
    getCategoryTrend(range),
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
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Full production build**

```bash
npx next build
```

Expected: `/trends` listed as a dynamic route, no errors.

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/trends/page.tsx
git commit -m "$(cat <<'EOF'
feat(trends): rewrite page as tabbed dashboard (Overview/Categories/Trips)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Tear down preview routes + remove Recharts

**Files:**
- Delete `app/(app)/trends-preview/` (entire directory)
- Remove `recharts` from `package.json` if nothing else imports it

- [ ] **Step 1: Confirm Recharts is unused**

```bash
grep -rn "from \"recharts\"\|from 'recharts'" app components lib 2>/dev/null
```

Expected: no output (we deleted the only consumer in Task 3).

- [ ] **Step 2: Remove the preview routes**

```bash
rm -rf app/\(app\)/trends-preview
```

- [ ] **Step 3: Uninstall recharts**

```bash
npm uninstall recharts
```

- [ ] **Step 4: Typecheck + final build**

```bash
npx tsc --noEmit
npx next build
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
chore(trends): remove preview routes and recharts dependency

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Self-review

**Spec coverage:**
- Tabs + persistent header ✓ (Tasks 6, 7)
- Headline insight ✓ (Tasks 1, 5, 7)
- SPEND ticker card ✓ (Tasks 2, 5, 7)
- Area chart with Y-axis + range toggle ✓ (Tasks 3, 7)
- Daily heatmap ✓ (Tasks 1, 5, 7)
- Top 5 + full ticker table ✓ (Tasks 1, 5, 7)
- Biggest changes ✓ (Tasks 1, 5, 7)
- Motion bucket pulse bars ✓ (Task 4)
- Trips list ✓ (Tasks 5, 7)
- Edge cases (no income, no expenses, no last month) handled in components ✓

**Type consistency:** `CategoryTrendRow.tagId` is `number | null`, `name` always defined ("Untagged" fallback), `sparkline` always length === trend.length. `DailySpendPoint` matches heatmap consumer. `BucketBreakdownRow` reused unchanged.

**Placeholder scan:** none. All code blocks complete.

**Recharts removal:** confirmed in Task 8 step 1; if grep returns hits, do NOT remove the dep.
