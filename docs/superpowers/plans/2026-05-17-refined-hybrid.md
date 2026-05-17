# Refined Hybrid — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Replace the four core mobile + desktop screens (Overview, Income, Bills, Trends) and the navigation chrome with the Refined Hybrid design.

**Architecture:** Shell components (`TopBar`, `TopTabs`, `BottomNav`, `Sidebar`) wrap server pages. Inside each page: shared `ContextStrip` + section-specific cards. Same components render at any width — only the chrome differs by breakpoint.

**Tech Stack:** Next.js 16 · React 19 · Drizzle · Tailwind v4 · lucide-react · motion (already installed)

**Spec:** [docs/superpowers/specs/2026-05-12-refined-hybrid-mobile-design.md](docs/superpowers/specs/2026-05-12-refined-hybrid-mobile-design.md)

**Depends on:** Lucide migration plan ([2026-05-17-lucide-icon-migration.md](2026-05-17-lucide-icon-migration.md)) — `lib/icons.ts` and `IconTile` are reused throughout.

**Verification:** `npx tsc --noEmit` after each task. `npx next build` after the page-rewrite phase.

---

## Phase 0 — Foundation

### Task 0.1: `lib/actions/forecast.ts` — projection helpers

```ts
// lib/actions/forecast.ts
export function dailyPace(spent: number, dayOfMonth: number): number {
  return dayOfMonth > 0 ? spent / dayOfMonth : 0;
}
export function projectedTotal(spent: number, dayOfMonth: number, daysInMonth: number): number {
  return Math.round(dailyPace(spent, dayOfMonth) * daysInMonth);
}
export function paceStatus(projected: number, budget: number): "good" | "bad" {
  if (budget <= 0) return "good";
  return projected <= budget ? "good" : "bad";
}
export function daysIntoMonth(date: Date): { day: number; total: number; pctThroughMonth: number } {
  const day = date.getDate();
  const total = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  return { day, total, pctThroughMonth: Math.round((day / total) * 100) };
}
```

Commit: `feat(forecast): pure projection helpers`

### Task 0.2: `lib/actions/expenses.ts` — `getRecentExpenses(monthId, limit?)`

If not already present in a usable form. Returns the same shape `getExpensesForMonth` returns, just with `LIMIT`. Used by the Overview → Expenses sub-tab when not filtered.

Commit: `feat(expenses): getRecentExpenses(monthId, limit)`

---

## Phase 1 — Shell components

These are the chrome. Build them in isolation; they don't break any page yet.

### Task 1.1: `components/layout/top-bar.tsx`

Sticky header at the top of every page (mobile + desktop). Title + sub + month switcher + top-action chips.

```tsx
"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { TopActionChips } from "./top-action-chips";

interface Props {
  title: string;
  sub?: string;
  kicker?: string;        // default "easyBudget"
  monthLabel?: string;    // "May 2026"
  onPrevMonth?: () => void;
  onNextMonth?: () => void;
}

export function TopBar({ title, sub, kicker = "easyBudget", monthLabel, onPrevMonth, onNextMonth }: Props) {
  return (
    <header className="flex items-start justify-between gap-3 px-4 md:px-8 pt-[max(1rem,env(safe-area-inset-top))] pb-3">
      <div className="min-w-0">
        <p className="text-[9px] font-bold tracking-[0.15em] uppercase text-muted-base">{kicker}</p>
        <h1 className="text-xl font-bold text-foreground tracking-tight">{title}</h1>
        {sub && <p className="text-xs text-muted-base mt-0.5">{sub}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {monthLabel && (
          <div className="flex items-center gap-1 bg-white/[0.025] border border-accent-purple/13 rounded-full px-2.5 py-1.5">
            <button onClick={onPrevMonth} aria-label="Previous month" className="text-muted-base"><ChevronLeft size={13} /></button>
            <span className="text-[11px] font-semibold text-foreground font-mono">{monthLabel}</span>
            <button onClick={onNextMonth} aria-label="Next month" className="text-muted-base"><ChevronRight size={13} /></button>
          </div>
        )}
        <TopActionChips />
      </div>
    </header>
  );
}
```

Commit: `feat(layout): TopBar component (sticky header with month switcher + actions)`

### Task 1.2: `components/layout/top-action-chips.tsx`

Bell + More buttons that open sheets. Initially: bell opens an empty "Notifications" sheet placeholder; ⋯ opens the More sheet.

```tsx
"use client";
import { useState } from "react";
import { Bell, MoreHorizontal } from "lucide-react";
import { MoreSheet } from "./more-sheet";

export function TopActionChips() {
  const [moreOpen, setMoreOpen] = useState(false);
  return (
    <>
      <button aria-label="Notifications" className="w-9 h-9 rounded-full border border-accent-purple/20 text-muted-base flex items-center justify-center">
        <Bell size={14} />
      </button>
      <button aria-label="More" onClick={() => setMoreOpen(true)} className="w-9 h-9 rounded-full border border-accent-purple/20 text-muted-base flex items-center justify-center">
        <MoreHorizontal size={14} />
      </button>
      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  );
}
```

Commit: `feat(layout): TopActionChips (bell + more)`

### Task 1.3: `components/layout/more-sheet.tsx`

Slide-up sheet (mobile bottom-sheet styling) with 5 destinations: Payments / Tags / Trips / Goals / Settings. Each is a `<Link>` with a lucide icon. Closes on tap.

Commit: `feat(layout): MoreSheet (Payments/Tags/Trips/Goals/Settings)`

### Task 1.4: `components/layout/top-tabs.tsx`

URL-state sub-tab strip. Reads `?sub=...` from `useSearchParams`. Active = first item when missing.

```tsx
"use client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

interface Props {
  tabs: { id: string; label: string }[];
}

export function TopTabs({ tabs }: Props) {
  const router = useRouter();
  const path = usePathname();
  const search = useSearchParams();
  const current = search.get("sub") || tabs[0]?.id;

  function setSub(id: string) {
    const params = new URLSearchParams(search.toString());
    params.set("sub", id);
    router.push(`${path}?${params.toString()}`);
  }

  return (
    <div className="border-b border-accent-purple/13 px-4 md:px-8 flex gap-1 overflow-x-auto">
      {tabs.map((t) => {
        const active = current === t.id;
        return (
          <button
            key={t.id}
            onClick={() => setSub(t.id)}
            className={`relative px-3 py-2.5 text-xs font-${active ? "bold" : "medium"} whitespace-nowrap transition-colors ${active ? "text-foreground" : "text-muted-base hover:text-foreground"}`}
          >
            {t.label}
            {active && (
              <span className="absolute -bottom-px left-1.5 right-1.5 h-0.5 rounded bg-gradient-to-r from-amber-400 to-pink-500" />
            )}
          </button>
        );
      })}
    </div>
  );
}
```

Commit: `feat(layout): TopTabs (URL-state sub-tab strip)`

### Task 1.5: Rewrite `components/layout/bottom-nav.tsx` to new order

Order: `Overview · Income · [FAB] · Bills · Trends`. Drop the "More" slot. Add tiny `→ → →` ticks above the icons. Active state keeps the magic-bubble. Mobile-only (`md:hidden`).

Commit: `feat(layout): BottomNav with new lifecycle order`

### Task 1.6: Rewrite `components/layout/sidebar.tsx` to mirror nav

Top group: Add Expense button → Overview / Income / Bills / Trends. Section divider. More group: Payments / Tags / Trips / Goals. Bottom: Settings.

Commit: `feat(layout): Sidebar mirrors new nav order, More section`

---

## Phase 2 — Shared content components

### Task 2.1: `components/layout/context-strip.tsx`

4-column grid: SPENT / PROJECTED / INCOME / BILLS DUE. Each tap calls a passed `onNav(tab)` (or uses `<Link>` directly — pick whichever fits Next.js routing simpler).

Commit: `feat(layout): ContextStrip shared 4-cell summary row`

### Task 2.2: `components/dashboard/hero-available-card.tsx`

Big "Available to spend" hero with dual progress + today marker + on-pace pill. Code in the spec.

Commit: `feat(dashboard): HeroAvailableCard`

### Task 2.3: `components/dashboard/allocation-grid.tsx`

3-card grid (Savings / Bills / Wants).

Commit: `feat(dashboard): AllocationGrid`

### Task 2.4: `components/dashboard/daily-pace-card.tsx`

Big mono number + day-by-day histogram + ghost future + dashed avg.

Commit: `feat(dashboard): DailyPaceCard`

### Task 2.5: `components/dashboard/recent-list.tsx`

Uses `IconTile` + `tagIcon`. Server component.

Commit: `feat(dashboard): RecentList`

### Task 2.6: `components/dashboard/upcoming-bills-strip.tsx` — rewrite

Horizontal-scroll cards, lucide icons, "in Xd"/"Xd late".

Commit: `feat(dashboard): upcoming-bills-strip uses lucide + new design`

### Task 2.7: `components/income/income-hero.tsx`

Budget total + arrived/expected stacked bar + legend.

Commit: `feat(income): IncomeHero with stacked bar`

### Task 2.8: `components/income/entry-row.tsx` — rewrite

CheckCircle2 (arrived) / Calendar (expected) tinted IconTile + amount in matching tone.

Commit: `feat(income): EntryRow with status column`

### Task 2.9: `components/income/goes-to-card.tsx`

Soft violet tinted card with "After bills X you'll have Y" sentence.

Commit: `feat(income): GoesToCard`

### Task 2.10: `components/bills/bills-hero.tsx`

Outstanding + due-date timeline + breakdown chips.

Commit: `feat(bills): BillsHero with timeline + chips`

### Task 2.11: `components/bills/bills-group.tsx` — rewrite

Tone-colored grouped list (Overdue/This Week/Later/Paid).

Commit: `feat(bills): BillsGroup tone-colored grouped list`

### Task 2.12: `components/bills/bills-calendar.tsx`

Calendar sub-tab: month grid + month switcher pills + upcoming list. See spec for visual details. Hardcode month-switcher to use the existing `?year`/`?month` URL state.

Commit: `feat(bills): BillsCalendar sub-tab content`

### Task 2.13: `components/overview/expenses-tab.tsx`

Expenses sub-tab: total + filter chips + list. V1 ships only the `All` filter; others render as disabled-looking pills.

Commit: `feat(overview): ExpensesTab sub-tab content`

### Task 2.14: `components/trends/insight-card.tsx`

Tone-bordered card with "INSIGHT" eyebrow. Move the existing insight rendering into this component.

Commit: `feat(trends): InsightCard with tone border`

### Task 2.15: `components/trends/chart-style-switcher.tsx`

Area / Line / Bar pills (client). Local state OR `?chart=area`. Decide locally — local state is simpler.

Commit: `feat(trends): ChartStyleSwitcher`

### Task 2.16: `components/trends/monthly-area-chart.tsx` — extend

Add Line and Bar modes (props: `style: "area" | "line" | "bar"`). Add projection extension (dashed line + outlined circle) past the last data point.

Commit: `feat(trends): MonthlyAreaChart supports line/bar + projection extension`

---

## Phase 3 — Page rewrites

### Task 3.1: `app/(app)/page.tsx` — Overview

Reads `?sub` ∈ `today | allocations | dailyPace | expenses` (default `today`). Renders:
- TopBar (with month switcher and "Day X of Y" sub)
- ContextStrip
- TopTabs (4 sub-tabs)
- Switches: `today` → hero + allocation + dailyPace + bills strip + recent; `allocations` → allocation grid only; `dailyPace` → daily-pace card only; `expenses` → `<ExpensesTab>`

Commit: `feat(page): Overview rewrite with sub-tabs`

### Task 3.2: `app/(app)/income/page.tsx` — Income

No sub-tabs. TopBar + ContextStrip + IncomeHero + entries list + GoesToCard.

Commit: `feat(page): Income rewrite`

### Task 3.3: `app/(app)/bills/page.tsx` — Bills

Reads `?sub` ∈ `all | overdue | recurring | paid | calendar` (default `all`). Switches accordingly:
- `all` → BillsHero + all 4 groups
- `overdue` → BillsHero + Overdue group only
- `recurring` → all bills with `frequency !== "one_time"` (which is most)
- `paid` → Paid group only
- `calendar` → `<BillsCalendar>`

Commit: `feat(page): Bills rewrite with sub-tabs + Calendar`

### Task 3.4: `app/(app)/trends/page.tsx` — Trends

Reads `?sub` ∈ `insights | categories | compare` (default `insights`). Switches:
- `insights` → InsightCard + MonthlyAreaChart with `ChartStyleSwitcher` + biggest movers
- `categories` → `CategoryTickerTable` (existing) + day/monthly toggle (existing)
- `compare` → side-by-side month-over-month diff (re-use trends data, render two columns); if simpler, V1 shows the existing biggest-movers list with a "vs last month" caption

Commit: `feat(page): Trends rewrite with sub-tabs`

### Task 3.5: `app/(app)/layout.tsx` — shell

Wire in `TopBar` (passed children render their own; layout may stay as-is if pages own the bar). Update Sidebar import to the new one. Bottom nav order already updated in Task 1.5.

Commit: `feat(layout): shell wires in new TopBar + Sidebar + BottomNav`

---

## Phase 4 — Build + smoke

### Task 4.1: Production build

```bash
npx next build
```

Expected: clean. All 4 routes still dynamic (`ƒ`).

### Task 4.2: Manual smoke test on dev

- Visit each section, confirm context strip values match
- Switch sub-tabs in URL, confirm active state + content swap
- Tap a context-strip cell — navigates to right section
- Resize browser to desktop — sidebar appears, bottom nav hides, content centers
- Resize back to mobile — sidebar hides, bottom nav appears, FAB visible
- ⋯ menu opens, navigates correctly

Commit any small fixes.

---

## Self-review

- Two-layer nav verified: bottom = section, top = sub-view
- ContextStrip identical across all 4 pages
- Income & Payments have no top sub-tabs (single view)
- Bills Calendar sub-tab renders the month grid + month pills + upcoming list
- Overview Expenses sub-tab renders the full recent-expense list
- `?sub=` survives reload / back-button
- Desktop renders sidebar, mobile renders bottom nav (no per-component branching beyond the shell)
- `lib/icons.ts` (from prior plan) used everywhere; no inline lucide imports duplicating BILL_ICON / tagIcon
