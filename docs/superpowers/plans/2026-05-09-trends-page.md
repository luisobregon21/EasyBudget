# Trends Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single-section Trends page with a combined dashboard: hero KPIs, multi-month chart (toggleable range), and four "this month" breakdowns (bucket, tag, payment method, trip).

**Architecture:** Server Component page in [app/(app)/trends/page.tsx](app/(app)/trends/page.tsx) orchestrates parallel data fetches against new actions in [lib/actions/trends.ts](lib/actions/trends.ts) plus existing actions in [lib/actions/expenses.ts](lib/actions/expenses.ts). Plain serializable data is passed into a mix of server breakdown components and one client `MonthlyTrendChart` (Recharts).

**Tech Stack:** Next.js 16 App Router · React 19 · Drizzle ORM · Recharts · Tailwind v4

**Spec:** [docs/superpowers/specs/2026-05-09-trends-page-design.md](docs/superpowers/specs/2026-05-09-trends-page-design.md)

**Verification:** This codebase has no test runner. Each task ends with `npx tsc --noEmit` (must pass with zero output) and a manual browser check at the routes the task affects.

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `lib/actions/trends.ts` | create | Server actions for trend data: `getMonthlyTrend`, `getExpensesByTag`, `getExpensesByBucket`, `getTripSpend` |
| `components/trends/range-toggle.tsx` | create | Client pills `[6mo ǀ 12mo ǀ YTD]` that push `?range=` to URL |
| `components/trends/monthly-trend-chart.tsx` | create | Client Recharts grouped bar chart (income vs spend) |
| `components/trends/hero-kpis.tsx` | create | Server component, three KPI chips |
| `components/trends/tag-breakdown.tsx` | create | Top 5 tags + expandable full list (client for the toggle) |
| `components/trends/bucket-breakdown.tsx` | create | Three rows (savings/bills/wants) vs allocation, server |
| `components/trends/trip-breakdown.tsx` | create | Per-trip rows, server |
| `components/trends/payment-method-breakdown.tsx` | create | Move existing inline payment-method UI here, server |
| `app/(app)/trends/page.tsx` | rewrite | Orchestrator: parse search params, parallel fetches, compose components |
| `package.json` | modify | Add `recharts` dependency |

---

## Task 1: Install Recharts

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install dependency**

```bash
npm install recharts
```

- [ ] **Step 2: Verify install**

```bash
npx tsc --noEmit
```

Expected: zero output (clean typecheck).

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat(trends): add recharts dependency"
```

---

## Task 2: Trends server actions — types and `getMonthlyTrend`

**Files:**
- Create: `lib/actions/trends.ts`

- [ ] **Step 1: Create the file with types and the monthly-trend action**

```ts
// lib/actions/trends.ts
"use server";
import { getDb, months, expenses } from "@/lib/db";
import { and, eq, gte, sql } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";

export type Range = "6mo" | "12mo" | "ytd";

export type TrendPoint = {
  year: number;
  month: number;
  label: string;        // e.g. "May"
  income: number;
  spent: number;
  savedPct: number;     // (income - spent) / income * 100, 0 if income === 0
};

export type TagBreakdownRow = {
  tagId: number | null;
  name: string;
  emoji: string;
  total: number;
  pct: number;          // share of total spend this month, 0–100
};

export type BucketBreakdownRow = {
  bucket: "savings" | "bills" | "wants";
  spent: number;
  allocated: number;
  pct: number;          // spent / allocated * 100, capped at 100 for the bar; raw kept separately
};

export type TripBreakdownRow = {
  tripId: number;
  name: string;
  budgetUsd: number | null;
  spent: number;
};

const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function rangeStart(range: Range, now: Date): { year: number; month: number } {
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  if (range === "ytd") return { year: y, month: 1 };
  const monthsBack = range === "6mo" ? 5 : 11;
  const totalMonth = m - monthsBack;
  const yearOffset = Math.floor((totalMonth - 1) / 12);
  const wrappedMonth = ((totalMonth - 1) % 12 + 12) % 12 + 1;
  return { year: y + yearOffset, month: wrappedMonth };
}

export async function getMonthlyTrend(range: Range): Promise<TrendPoint[]> {
  const user = await requireSession();
  const db = getDb();
  const now = new Date();
  const { year: startYear, month: startMonth } = rangeStart(range, now);

  // Fetch month rows in range
  const monthRows = await db.select({
    id:     months.id,
    year:   months.year,
    month:  months.month,
    income: months.income,
  })
    .from(months)
    .where(and(
      eq(months.userId, user.id!),
      sql`${months.year} * 12 + ${months.month} >= ${startYear * 12 + startMonth}`,
    ))
    .orderBy(months.year, months.month);

  if (monthRows.length === 0) return [];

  // Sum spend per month in one query
  const spendRows = await db.select({
    monthId: expenses.monthId,
    total:   sql<number>`coalesce(sum(${expenses.amountUsd}), 0)`,
  })
    .from(expenses)
    .where(eq(expenses.userId, user.id!))
    .groupBy(expenses.monthId);

  const spendByMonth = new Map<number, number>();
  for (const row of spendRows) spendByMonth.set(row.monthId, Number(row.total));

  return monthRows.map((m) => {
    const spent = spendByMonth.get(m.id) ?? 0;
    const savedPct = m.income > 0 ? Math.max(0, ((m.income - spent) / m.income) * 100) : 0;
    return {
      year: m.year,
      month: m.month,
      label: MONTH_LABELS[m.month - 1],
      income: m.income,
      spent,
      savedPct: Math.round(savedPct),
    };
  });
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
git commit -m "feat(trends): types + getMonthlyTrend action"
```

---

## Task 3: `getExpensesByTag` action

**Files:**
- Modify: `lib/actions/trends.ts` — append to end of file

- [ ] **Step 1: Append imports if needed and the action**

Add `tags` to the existing `from "@/lib/db"` import line so it reads:

```ts
import { getDb, months, expenses, tags } from "@/lib/db";
```

Append at end of file:

```ts
export async function getExpensesByTag(monthId: number): Promise<TagBreakdownRow[]> {
  const user = await requireSession();
  const db = getDb();

  const rows = await db.select({
    tagId:    expenses.tagId,
    tagName:  tags.name,
    tagEmoji: tags.emoji,
    total:    sql<number>`sum(${expenses.amountUsd})`,
  })
    .from(expenses)
    .leftJoin(tags, eq(expenses.tagId, tags.id))
    .where(and(eq(expenses.monthId, monthId), eq(expenses.userId, user.id!)))
    .groupBy(expenses.tagId, tags.name, tags.emoji);

  const totalSpent = rows.reduce((s, r) => s + Number(r.total), 0);

  return rows
    .map((r) => ({
      tagId: r.tagId,
      name:  r.tagName ?? "Untagged",
      emoji: r.tagEmoji ?? "🏷️",
      total: Number(r.total),
      pct:   totalSpent > 0 ? Math.round((Number(r.total) / totalSpent) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);
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
git commit -m "feat(trends): getExpensesByTag action"
```

---

## Task 4: `getExpensesByBucket` action

**Files:**
- Modify: `lib/actions/trends.ts`

- [ ] **Step 1: Append the action**

```ts
export async function getExpensesByBucket(monthId: number): Promise<BucketBreakdownRow[]> {
  const user = await requireSession();
  const db = getDb();

  const [monthRow] = await db.select({
    income:     months.income,
    savingsPct: months.savingsPct,
    billsPct:   months.billsPct,
    wantsPct:   months.wantsPct,
  })
    .from(months)
    .where(and(eq(months.id, monthId), eq(months.userId, user.id!)))
    .limit(1);

  if (!monthRow) return [];

  const spendRows = await db.select({
    bucket: expenses.bucket,
    total:  sql<number>`sum(${expenses.amountUsd})`,
  })
    .from(expenses)
    .where(and(eq(expenses.monthId, monthId), eq(expenses.userId, user.id!)))
    .groupBy(expenses.bucket);

  const spentByBucket = new Map<string, number>();
  for (const r of spendRows) spentByBucket.set(r.bucket, Number(r.total));

  const buckets: Array<{ bucket: BucketBreakdownRow["bucket"]; pct: number }> = [
    { bucket: "savings", pct: monthRow.savingsPct },
    { bucket: "bills",   pct: monthRow.billsPct },
    { bucket: "wants",   pct: monthRow.wantsPct },
  ];

  return buckets.map(({ bucket, pct }) => {
    const allocated = monthRow.income * (pct / 100);
    const spent     = spentByBucket.get(bucket) ?? 0;
    const usedPct   = allocated > 0 ? Math.round((spent / allocated) * 100) : 0;
    return { bucket, spent, allocated, pct: usedPct };
  });
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
git commit -m "feat(trends): getExpensesByBucket action"
```

---

## Task 5: `getTripSpend` action

**Files:**
- Modify: `lib/actions/trends.ts`

- [ ] **Step 1: Add `trips` to imports and append the action**

Update import line:

```ts
import { getDb, months, expenses, tags, trips } from "@/lib/db";
```

Append:

```ts
export async function getTripSpend(monthId: number): Promise<TripBreakdownRow[]> {
  const user = await requireSession();
  const db = getDb();

  const rows = await db.select({
    tripId:    trips.id,
    tripName:  trips.name,
    budgetUsd: trips.budgetUsd,
    total:     sql<number>`coalesce(sum(${expenses.amountUsd}), 0)`,
  })
    .from(expenses)
    .innerJoin(trips, eq(expenses.tripId, trips.id))
    .where(and(eq(expenses.monthId, monthId), eq(expenses.userId, user.id!)))
    .groupBy(trips.id, trips.name, trips.budgetUsd);

  return rows
    .map((r) => ({
      tripId:    r.tripId,
      name:      r.tripName,
      budgetUsd: r.budgetUsd,
      spent:     Number(r.total),
    }))
    .sort((a, b) => b.spent - a.spent);
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
git commit -m "feat(trends): getTripSpend action"
```

---

## Task 6: `RangeToggle` client component

**Files:**
- Create: `components/trends/range-toggle.tsx`

- [ ] **Step 1: Create component**

```tsx
"use client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Range } from "@/lib/actions/trends";

const OPTIONS: { value: Range; label: string }[] = [
  { value: "6mo",  label: "6 mo"  },
  { value: "12mo", label: "12 mo" },
  { value: "ytd",  label: "YTD"   },
];

interface Props {
  current: Range;
}

export function RangeToggle({ current }: Props) {
  const router = useRouter();
  const path = usePathname();
  const search = useSearchParams();

  function setRange(r: Range) {
    const params = new URLSearchParams(search.toString());
    params.set("range", r);
    router.push(`${path}?${params.toString()}`);
  }

  return (
    <div className="inline-flex rounded-xl bg-white/[0.04] border border-accent-purple/20 p-1 gap-1">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => setRange(o.value)}
          className={cn(
            "px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors",
            current === o.value
              ? "bg-accent-purple text-white"
              : "text-muted-base hover:text-foreground"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: zero output.

- [ ] **Step 3: Commit**

```bash
git add components/trends/range-toggle.tsx
git commit -m "feat(trends): RangeToggle client component"
```

---

## Task 7: `MonthlyTrendChart` client component

**Files:**
- Create: `components/trends/monthly-trend-chart.tsx`

- [ ] **Step 1: Create component**

```tsx
"use client";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TrendPoint } from "@/lib/actions/trends";
import { formatCurrency } from "@/lib/utils";

interface Props {
  data: TrendPoint[];
}

export function MonthlyTrendChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <p className="text-muted-base text-sm text-center py-8">
        Not enough data for a trend yet. Add income and expenses to see your history.
      </p>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "#a78bfa", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fill: "#9ca3af", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `$${Math.round(v / 1000)}k`}
          />
          <Tooltip
            contentStyle={{
              background: "#1e1235",
              border: "1px solid rgba(167,139,250,0.3)",
              borderRadius: 12,
              fontSize: 12,
            }}
            formatter={(v: number, name: string) => [formatCurrency(v), name]}
            labelStyle={{ color: "#fbbf24", fontWeight: 700 }}
          />
          <Bar dataKey="income" name="Income" fill="#fbbf24" radius={[6, 6, 0, 0]} />
          <Bar dataKey="spent"  name="Spent"  fill="#ec4899" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: zero output.

- [ ] **Step 3: Commit**

```bash
git add components/trends/monthly-trend-chart.tsx
git commit -m "feat(trends): MonthlyTrendChart Recharts component"
```

---

## Task 8: `HeroKpis` server component

**Files:**
- Create: `components/trends/hero-kpis.tsx`

- [ ] **Step 1: Create component**

```tsx
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

interface Props {
  thisMonthSpent: number;
  lastMonthSpent: number;
  income: number;
  targetSpendPct: number;   // wantsPct + billsPct
}

function Chip({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "good" | "bad" }) {
  const toneClass =
    tone === "good" ? "text-green-400" :
    tone === "bad"  ? "text-red-400"   :
    "text-foreground";
  return (
    <div className="flex-1 rounded-2xl bg-white/[0.03] border border-accent-purple/10 p-4">
      <p className="text-muted-base text-[9px] uppercase tracking-widest font-semibold">{label}</p>
      <p className={`text-lg font-black ${toneClass} mt-1`}>{value}</p>
      {sub && <p className="text-muted-base text-[10px] mt-0.5">{sub}</p>}
    </div>
  );
}

export function HeroKpis({ thisMonthSpent, lastMonthSpent, income, targetSpendPct }: Props) {
  const target = income * (targetSpendPct / 100);
  const delta  = thisMonthSpent - target;

  let vsTargetChip;
  if (income === 0) {
    vsTargetChip = (
      <div className="flex-1 rounded-2xl bg-white/[0.03] border border-accent-purple/10 p-4">
        <p className="text-muted-base text-[9px] uppercase tracking-widest font-semibold">Vs Target</p>
        <Link href="/income" className="text-sm text-accent-gold underline mt-1 block">
          Set income to see target
        </Link>
      </div>
    );
  } else if (delta < 0) {
    vsTargetChip = (
      <Chip
        label="Vs Target"
        value={`-${formatCurrency(Math.abs(delta))}`}
        sub="under target"
        tone="good"
      />
    );
  } else {
    vsTargetChip = (
      <Chip
        label="Vs Target"
        value={`+${formatCurrency(delta)}`}
        sub="over target"
        tone="bad"
      />
    );
  }

  return (
    <div className="flex gap-3">
      <Chip label="This Month" value={formatCurrency(thisMonthSpent)} sub="spent" />
      <Chip label="Last Month" value={formatCurrency(lastMonthSpent)} sub="spent" />
      {vsTargetChip}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: zero output.

- [ ] **Step 3: Commit**

```bash
git add components/trends/hero-kpis.tsx
git commit -m "feat(trends): HeroKpis component with vs-target logic"
```

---

## Task 9: `BucketBreakdown` server component

**Files:**
- Create: `components/trends/bucket-breakdown.tsx`

- [ ] **Step 1: Create component**

```tsx
import { formatCurrency } from "@/lib/utils";
import type { BucketBreakdownRow } from "@/lib/actions/trends";

const STYLES: Record<BucketBreakdownRow["bucket"], { label: string; bar: string; icon: string }> = {
  savings: { label: "Savings",  bar: "from-amber-400 to-amber-500",   icon: "💰" },
  bills:   { label: "Bills",    bar: "from-pink-500 to-pink-400",     icon: "🏦" },
  wants:   { label: "Personal", bar: "from-violet-500 to-violet-400", icon: "✨" },
};

interface Props {
  buckets: BucketBreakdownRow[];
}

export function BucketBreakdown({ buckets }: Props) {
  if (buckets.length === 0 || buckets.every((b) => b.spent === 0 && b.allocated === 0)) {
    return <p className="text-muted-base text-sm text-center py-8">No budget set this month.</p>;
  }
  return (
    <div className="rounded-2xl bg-white/[0.03] border border-accent-purple/10 divide-y divide-white/5">
      {buckets.map((b) => {
        const s = STYLES[b.bucket];
        const fill = Math.min(b.pct, 100);
        const over = b.pct > 100;
        return (
          <div key={b.bucket} className="p-4 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-foreground font-semibold">
                <span>{s.icon}</span>{s.label}
              </span>
              <span className={`text-xs font-bold ${over ? "text-red-400" : "text-foreground"}`}>
                {formatCurrency(b.spent)} / {formatCurrency(b.allocated)}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${over ? "from-red-500 to-red-400" : s.bar}`}
                style={{ width: `${fill}%` }}
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

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: zero output.

- [ ] **Step 3: Commit**

```bash
git add components/trends/bucket-breakdown.tsx
git commit -m "feat(trends): BucketBreakdown component"
```

---

## Task 10: `TagBreakdown` component (with expand toggle)

**Files:**
- Create: `components/trends/tag-breakdown.tsx`

- [ ] **Step 1: Create component**

```tsx
"use client";
import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import type { TagBreakdownRow } from "@/lib/actions/trends";

interface Props {
  tags: TagBreakdownRow[];
}

export function TagBreakdown({ tags }: Props) {
  const [expanded, setExpanded] = useState(false);
  if (tags.length === 0) {
    return <p className="text-muted-base text-sm text-center py-8">No tagged expenses this month.</p>;
  }
  const visible = expanded ? tags : tags.slice(0, 5);
  return (
    <div className="rounded-2xl bg-white/[0.03] border border-accent-purple/10 divide-y divide-white/5">
      {visible.map((t) => (
        <div key={`${t.tagId}-${t.name}`} className="p-4 flex items-center gap-3">
          <span className="text-lg">{t.emoji}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-foreground font-medium truncate">{t.name}</p>
              <p className="text-amber-400 text-sm font-bold shrink-0">{formatCurrency(t.total)}</p>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div className="h-full rounded-full bg-gradient-brand" style={{ width: `${t.pct}%` }} />
            </div>
            <p className="text-muted-base text-[10px] mt-0.5">{t.pct}%</p>
          </div>
        </div>
      ))}
      {tags.length > 5 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="w-full p-3 text-xs text-accent-purple-light hover:text-foreground"
        >
          {expanded ? "Show less" : `Show all ${tags.length}`}
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: zero output.

- [ ] **Step 3: Commit**

```bash
git add components/trends/tag-breakdown.tsx
git commit -m "feat(trends): TagBreakdown component with expand toggle"
```

---

## Task 11: `TripBreakdown` server component

**Files:**
- Create: `components/trends/trip-breakdown.tsx`

- [ ] **Step 1: Create component**

```tsx
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import type { TripBreakdownRow } from "@/lib/actions/trends";

interface Props {
  trips: TripBreakdownRow[];
}

export function TripBreakdown({ trips }: Props) {
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
              <p className="text-foreground font-medium truncate">{t.name}</p>
              <p className={`text-sm font-bold ${over ? "text-red-400" : "text-amber-400"} shrink-0`}>
                {formatCurrency(t.spent)}
                {t.budgetUsd ? <span className="text-muted-base font-normal"> / {formatCurrency(t.budgetUsd)}</span> : null}
              </p>
            </div>
            {pct !== null && (
              <>
                <div className="mt-2 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${over ? "from-red-500 to-red-400" : "from-cyan-400 to-cyan-500"}`}
                    style={{ width: `${fill}%` }}
                  />
                </div>
                <p className="text-muted-base text-[10px] mt-0.5">{pct}%</p>
              </>
            )}
          </Link>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: zero output.

- [ ] **Step 3: Commit**

```bash
git add components/trends/trip-breakdown.tsx
git commit -m "feat(trends): TripBreakdown component"
```

---

## Task 12: `PaymentMethodBreakdown` server component (extract existing UI)

**Files:**
- Create: `components/trends/payment-method-breakdown.tsx`

- [ ] **Step 1: Create component**

```tsx
import { formatCurrency } from "@/lib/utils";

interface Row {
  key: string;
  name: string;
  total: number;
}

interface Props {
  rows: Row[];
  totalSpent: number;
}

export function PaymentMethodBreakdown({ rows, totalSpent }: Props) {
  if (rows.length === 0) {
    return <p className="text-muted-base text-sm text-center py-8">No payments recorded this month.</p>;
  }
  return (
    <div className="rounded-2xl bg-white/[0.03] border border-accent-purple/10 divide-y divide-white/5">
      {rows.map((m) => {
        const pct = totalSpent > 0 ? Math.round((m.total / totalSpent) * 100) : 0;
        return (
          <div key={m.key} className="flex items-center justify-between p-4 gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-foreground font-medium">{m.name}</p>
              <div className="mt-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                <div className="h-full rounded-full bg-gradient-brand" style={{ width: `${pct}%` }} />
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-amber-400 font-bold">{formatCurrency(m.total)}</p>
              <p className="text-muted-base text-xs">{pct}%</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: zero output.

- [ ] **Step 3: Commit**

```bash
git add components/trends/payment-method-breakdown.tsx
git commit -m "feat(trends): PaymentMethodBreakdown component"
```

---

## Task 13: Rewrite `/trends` page

**Files:**
- Rewrite: `app/(app)/trends/page.tsx`

- [ ] **Step 1: Replace file contents**

```tsx
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
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: zero output.

- [ ] **Step 3: Production build**

```bash
npx next build
```

Expected: build succeeds, `/trends` listed as a route.

- [ ] **Step 4: Manual browser smoke test**

Start the dev server (`AUTH_URL=http://192.168.1.10:3000 npm run dev -- --hostname 0.0.0.0`) and verify:
- `/trends` renders three KPI chips, a chart, and four breakdown sections.
- Clicking 6 mo / 12 mo / YTD reloads the chart with the URL param updated.
- Page renders fine on a fresh user with no expenses (each section shows its own empty state).

- [ ] **Step 5: Commit**

```bash
git add app/(app)/trends/page.tsx
git commit -m "feat(trends): rewrite page as combined dashboard"
```

---

## Self-Review

**Spec coverage check:**
- Hero KPIs (3 chips, "vs target" formula) → Tasks 8, 13 ✓
- Multi-month chart, toggleable range → Tasks 6, 7, 13 ✓
- Bucket / Tag / Payment / Trip breakdowns → Tasks 9, 10, 11, 12, 13 ✓
- Server actions (`getMonthlyTrend`, `getExpensesByTag`, `getExpensesByBucket`, `getTripSpend`) → Tasks 2, 3, 4, 5 ✓
- Edge cases (no income, no expenses, no budget on trip, range with <2 months) → covered in components 7, 8, 9, 10, 11 ✓
- File structure matches spec ✓
- Recharts install → Task 1 ✓

**Type consistency check:** `Range`, `TrendPoint`, `TagBreakdownRow`, `BucketBreakdownRow`, `TripBreakdownRow` defined in Task 2 and used unchanged in Tasks 6–11, 13. ✓

**Placeholder scan:** No TBD/TODO/"similar to". Each task has complete code. ✓

**Note on existing patterns:** This codebase has no test runner — verification is `tsc --noEmit` + manual browser checks (matches existing development practice in the repo). All actions follow the established `requireSession()` + `getDb()` + `revalidatePath` pattern from `lib/actions/expenses.ts`.
