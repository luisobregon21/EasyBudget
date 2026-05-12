# Trends Daily/Monthly Toggle — Plan

> Focused extension of the trends redesign (`2026-05-11-trends-redesign-design.md`). Adds a Daily/Monthly toggle to the "All categories" ticker on the Categories tab. See full design in chat thread (locked 2026-05-11).

**Goal:** Let users see category spend either by month (current behavior) or by day-of-current-month, like switching between a stock's 1Y and 1D chart.

**Verification:** `npx tsc --noEmit` (zero output) + commit each task. `npx next build` at the end.

---

## Task 1: Extend `getCategoryTrend` to support `view: "daily"`

**Files:** Modify `lib/actions/trends.ts`

- [ ] **Step 1: Update `CategoryTrendRow` to add optional `isNew`**

Find the existing `CategoryTrendRow` type and update:

```ts
export type CategoryTrendRow = {
  tagId: number | null;
  name: string;
  emoji: string;
  currentTotal: number;
  lastMonthTotal: number;
  deltaPct: number;
  sparkline: number[];
  isNew?: boolean;        // daily view only: today > 0, yesterday === 0
};
```

- [ ] **Step 2: Add `CategoryView` type at the top of the file (after `Range`)**

```ts
export type CategoryView = "monthly" | "daily";
```

- [ ] **Step 3: Replace `getCategoryTrend` with the dual-mode version**

```ts
export async function getCategoryTrend(
  range: Range,
  selectedYear: number,
  selectedMonth: number,
  view: CategoryView = "monthly",
): Promise<CategoryTrendRow[]> {
  const user = await requireSession();
  const db = getDb();

  if (view === "daily") {
    return getCategoryTrendDaily(user.id!, selectedYear, selectedMonth);
  }
  return getCategoryTrendMonthly(user.id!, db, range, selectedYear, selectedMonth);
}

async function getCategoryTrendMonthly(
  userId: string,
  db: ReturnType<typeof getDb>,
  range: Range,
  selectedYear: number,
  selectedMonth: number,
): Promise<CategoryTrendRow[]> {
  const { year: startYear, month: startMonth } = rangeStart(range, new Date(selectedYear, selectedMonth - 1, 1));
  const selectedKey = selectedYear * 12 + selectedMonth;

  const monthRows = await db.select({ id: months.id, year: months.year, month: months.month })
    .from(months)
    .where(and(
      eq(months.userId, userId),
      sql`${months.year} * 12 + ${months.month} >= ${startYear * 12 + startMonth}`,
      sql`${months.year} * 12 + ${months.month} <= ${selectedKey}`,
    ))
    .orderBy(months.year, months.month);
  if (monthRows.length === 0) return [];
  const monthIds = monthRows.map((m) => m.id);

  const rows = await db.select({
    tagId:    expenses.tagId,
    monthId:  expenses.monthId,
    tagName:  tags.name,
    tagEmoji: tags.emoji,
    total:    sql<number>`sum(${expenses.amountUsd})`,
  })
    .from(expenses)
    .leftJoin(tags, eq(expenses.tagId, tags.id))
    .where(and(eq(expenses.userId, userId), inArray(expenses.monthId, monthIds)))
    .groupBy(expenses.tagId, expenses.monthId, tags.name, tags.emoji);

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

  const currentMonthRow = monthRows.find((m) => m.year === selectedYear && m.month === selectedMonth);
  const currentMonthId  = currentMonthRow?.id ?? null;
  const currentIdx      = currentMonthRow ? monthRows.indexOf(currentMonthRow) : -1;
  const lastMonthId     = currentIdx > 0 ? monthRows[currentIdx - 1].id : null;

  const result: CategoryTrendRow[] = [];
  for (const b of buckets.values()) {
    const sparkline = monthRows.map((m) => b.byMonth.get(m.id) ?? 0);
    const currentTotal   = currentMonthId !== null ? (b.byMonth.get(currentMonthId) ?? 0) : 0;
    const lastMonthTotal = lastMonthId    !== null ? (b.byMonth.get(lastMonthId)    ?? 0) : 0;
    let deltaPct = 0;
    if (lastMonthTotal === 0 && currentTotal > 0) deltaPct = 100;
    else if (lastMonthTotal > 0) deltaPct = Math.round(((currentTotal - lastMonthTotal) / lastMonthTotal) * 100);
    if (sparkline.every((v) => v === 0) && currentTotal === 0) continue;
    result.push({ tagId: b.tagId, name: b.name, emoji: b.emoji, currentTotal, lastMonthTotal, deltaPct, sparkline });
  }
  return result.sort((a, b) => b.currentTotal - a.currentTotal);
}

async function getCategoryTrendDaily(
  userId: string,
  selectedYear: number,
  selectedMonth: number,
): Promise<CategoryTrendRow[]> {
  const db = getDb();

  // Locate the month row for the selected (year, month)
  const [monthRow] = await db.select({ id: months.id })
    .from(months)
    .where(and(
      eq(months.userId, userId),
      eq(months.year, selectedYear),
      eq(months.month, selectedMonth),
    ))
    .limit(1);
  if (!monthRow) return [];

  // Daily group: one row per (tagId, date)
  const rows = await db.select({
    tagId:    expenses.tagId,
    date:     expenses.date,
    tagName:  tags.name,
    tagEmoji: tags.emoji,
    total:    sql<number>`sum(${expenses.amountUsd})`,
  })
    .from(expenses)
    .leftJoin(tags, eq(expenses.tagId, tags.id))
    .where(and(eq(expenses.monthId, monthRow.id), eq(expenses.userId, userId)))
    .groupBy(expenses.tagId, expenses.date, tags.name, tags.emoji);

  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const now = new Date();
  const isCurrentMonth = now.getFullYear() === selectedYear && (now.getMonth() + 1) === selectedMonth;
  // "Today" index = today's day-of-month (current month) or the last day (past month)
  const todayIdx = isCurrentMonth ? now.getDate() - 1 : daysInMonth - 1;
  const yesterdayIdx = todayIdx > 0 ? todayIdx - 1 : null;

  type Bucket = { tagId: number | null; name: string; emoji: string; byDay: number[] };
  const buckets = new Map<string, Bucket>();
  for (const r of rows) {
    const key = `${r.tagId ?? "null"}|${r.tagName ?? "Untagged"}`;
    let b = buckets.get(key);
    if (!b) {
      b = {
        tagId: r.tagId,
        name:  r.tagName ?? "Untagged",
        emoji: r.tagEmoji ?? "🏷️",
        byDay: new Array(daysInMonth).fill(0),
      };
      buckets.set(key, b);
    }
    const day = parseInt(r.date.split("-")[2]); // YYYY-MM-DD
    if (day >= 1 && day <= daysInMonth) {
      b.byDay[day - 1] = Number(r.total);
    }
  }

  const result: CategoryTrendRow[] = [];
  for (const b of buckets.values()) {
    const monthTotal = b.byDay.reduce((s, v) => s + v, 0);
    if (monthTotal === 0) continue;
    const today     = b.byDay[todayIdx] ?? 0;
    const yesterday = yesterdayIdx !== null ? (b.byDay[yesterdayIdx] ?? 0) : 0;
    let deltaPct = 0;
    let isNew = false;
    if (yesterday === 0 && today > 0) {
      isNew = true;
    } else if (today === 0 && yesterday > 0) {
      deltaPct = -100;
    } else if (yesterday > 0) {
      deltaPct = Math.round(((today - yesterday) / yesterday) * 100);
    }
    result.push({
      tagId: b.tagId,
      name: b.name,
      emoji: b.emoji,
      currentTotal: today,
      lastMonthTotal: yesterday,
      deltaPct,
      sparkline: b.byDay,
      isNew,
    });
  }
  // Sort by today's spend (current month) or last day's spend (past month), desc
  return result.sort((a, b) => b.currentTotal - a.currentTotal);
}
```

- [ ] **Step 4: Typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add lib/actions/trends.ts
git commit -m "$(cat <<'EOF'
feat(trends): getCategoryTrend supports daily view

When view="daily", group expenses by (tagId, date) and return a
day-by-day sparkline for the selected month. currentTotal = today's
spend (or last day for past months); lastMonthTotal = yesterday's
(or day-before). isNew flag handles "today > 0, yesterday === 0" so
the UI can show "NEW" instead of a misleading percentage.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: View toggle client component

**Files:** Create `components/trends/category-view-toggle.tsx`

- [ ] **Step 1: Create component**

```tsx
"use client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { CategoryView } from "@/lib/actions/trends";

interface Props {
  current: CategoryView;
}

export function CategoryViewToggle({ current }: Props) {
  const router = useRouter();
  const path = usePathname();
  const search = useSearchParams();

  function setView(v: CategoryView) {
    const params = new URLSearchParams(search.toString());
    params.set("categoryView", v);
    router.push(`${path}?${params.toString()}`);
  }

  return (
    <div className="inline-flex rounded-lg bg-white/[0.04] border border-accent-purple/20 p-1 gap-1 text-xs">
      <button
        type="button"
        onClick={() => setView("daily")}
        className={cn(
          "px-2 py-0.5 rounded font-semibold transition-colors",
          current === "daily" ? "bg-accent-purple text-white" : "text-muted-base hover:text-foreground"
        )}
      >
        Daily
      </button>
      <button
        type="button"
        onClick={() => setView("monthly")}
        className={cn(
          "px-2 py-0.5 rounded font-semibold transition-colors",
          current === "monthly" ? "bg-accent-purple text-white" : "text-muted-base hover:text-foreground"
        )}
      >
        Monthly
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
npx tsc --noEmit
git add components/trends/category-view-toggle.tsx
git commit -m "feat(trends): CategoryViewToggle client component

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Update `CategoryTickerTable` to handle daily-view fields

**Files:** Modify `components/trends/category-ticker-table.tsx`

- [ ] **Step 1: Update the change-column logic**

Find the existing render of the change cell. Replace the `<p className={...}>` block that renders the change indicator with this logic:

```tsx
{/* Change cell — handles "NEW" (isNew), "—" (both 0), or signed % */}
{(() => {
  const up = t.deltaPct > 0;
  const flat = t.deltaPct === 0;
  if (t.isNew) {
    return (
      <p className="w-16 text-right text-xs font-mono font-bold text-red-400">▲ NEW</p>
    );
  }
  if (flat && t.currentTotal === 0 && t.lastMonthTotal === 0) {
    return <p className="w-16 text-right text-xs font-mono font-bold text-muted-base">—</p>;
  }
  return (
    <p className={`w-16 text-right text-xs font-mono font-bold ${
      flat ? "text-muted-base" : up ? "text-red-400" : "text-green-400"
    }`}>
      {flat ? "—" : `${up ? "▲" : "▼"} ${Math.abs(t.deltaPct)}%`}
    </p>
  );
})()}
```

The full updated component:

```tsx
import { formatCurrency } from "@/lib/utils";
import { Sparkline } from "./sparkline";
import type { CategoryTrendRow } from "@/lib/actions/trends";

interface Props {
  rows: CategoryTrendRow[];
  limit?: number;
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
                {t.isNew ? (
                  <p className="w-16 text-right text-xs font-mono font-bold text-red-400">▲ NEW</p>
                ) : flat && t.currentTotal === 0 && t.lastMonthTotal === 0 ? (
                  <p className="w-16 text-right text-xs font-mono font-bold text-muted-base">—</p>
                ) : (
                  <p className={`w-16 text-right text-xs font-mono font-bold ${
                    flat ? "text-muted-base" : up ? "text-red-400" : "text-green-400"
                  }`}>
                    {flat ? "—" : `${up ? "▲" : "▼"} ${Math.abs(t.deltaPct)}%`}
                  </p>
                )}
                <div className="w-24 flex justify-end">
                  <Sparkline values={t.sparkline} up={t.isNew ? true : up} width={84} height={24} />
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

- [ ] **Step 2: Typecheck + commit**

```bash
npx tsc --noEmit
git add components/trends/category-ticker-table.tsx
git commit -m "feat(trends): CategoryTickerTable renders NEW + dash cases

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Wire the toggle into the page

**Files:** Modify `app/(app)/trends/page.tsx`

- [ ] **Step 1: Read `categoryView` from searchParams**

Update the `searchParams` type and the parsing:

```tsx
export default async function TrendsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; range?: string; categoryView?: string }>;
}) {
  const params = await searchParams;
  const def    = currentYearMonth();
  const year   = parseInt(params.year  ?? String(def.year));
  const month  = parseInt(params.month ?? String(def.month));
  const range: Range = (VALID_RANGES.includes(params.range as Range) ? params.range : "6mo") as Range;
  const categoryView: CategoryView =
    params.categoryView === "daily" ? "daily" : "monthly";

  // Hide the daily toggle for future months — only show Monthly view
  const now = new Date();
  const selectedKey = year * 12 + month;
  const currentKey  = now.getFullYear() * 12 + (now.getMonth() + 1);
  const isFutureMonth = selectedKey > currentKey;
  const effectiveView: CategoryView = isFutureMonth ? "monthly" : categoryView;
```

Add the imports at the top:

```tsx
import { CategoryViewToggle } from "@/components/trends/category-view-toggle";
import type { CategoryView } from "@/lib/actions/trends";
```

- [ ] **Step 2: Pass `effectiveView` to `getCategoryTrend` in the Promise.all**

Find:
```tsx
getCategoryTrend(range, year, month),
```

Replace with:
```tsx
getCategoryTrend(range, year, month, effectiveView),
```

- [ ] **Step 3: Render the toggle next to "All categories" header**

Find the `categories` slot in the `<Tabs>` block. Replace the "All categories" section:

```tsx
<section className="space-y-2">
  <div className="flex items-center justify-between">
    <h3 className="text-foreground font-semibold text-sm">All categories</h3>
    {!isFutureMonth && <CategoryViewToggle current={effectiveView} />}
  </div>
  <CategoryTickerTable rows={categoryTrend} />
</section>
```

- [ ] **Step 4: Typecheck + production build**

```bash
npx tsc --noEmit
npx next build
```

- [ ] **Step 5: Commit**

```bash
git add app/\(app\)/trends/page.tsx
git commit -m "$(cat <<'EOF'
feat(trends): wire Daily/Monthly category toggle into the page

Reads ?categoryView=daily from URL, scopes to the selected month, and
renders the toggle next to the All categories header (hidden for future
months).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Self-review

- Daily view groups by `(tagId, date)`, returns one sparkline point per day of selected month ✓
- Past months use last day as "today", day-before as "yesterday" ✓
- Future months: toggle hidden, view forced to monthly ✓
- `isNew` flag handles today>0/yesterday=0; the `—` case handles both=0 ✓
- Categories with $0 month-total are hidden in daily view ✓ (via `if (monthTotal === 0) continue`)
- Sort by today's spend, desc ✓
- URL persistence via `?categoryView=` ✓
- Monthly view behavior unchanged (default + fallback) ✓
- Existing consumers of `CategoryTrendRow` still work (only new field is optional `isNew`) ✓
