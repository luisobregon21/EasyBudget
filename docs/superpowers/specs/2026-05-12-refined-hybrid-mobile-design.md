# Refined Hybrid — Mobile + Desktop Redesign Spec

**Status:** Approved 2026-05-17 (updated; was mobile-only on 2026-05-12)
**Source of truth:** Claude Design canvas bundle, "Hybrid · all four tabs wired" (`direction-a.jsx` in the handoff)
**Preview:** `/preview/hybrid` (delete after ship)

## Goal

Replace the four core screens (Overview, Income, Bills, Trends) and the navigation on both **mobile and desktop** with the designer-approved "Refined Hybrid" layout. Visual identity stays (deep purple/dark + amber→pink gradient — **gradient theme only; mint dropped per user**) but every screen gets a shared context strip, projection-aware visualizations, and lucide icons instead of emoji. Nav reorders to reflect a money lifecycle: **Overview → Income → Bills → Trends**.

### Mobile vs Desktop

The **content inside the page** (context strip, hero cards, allocation grid, daily-pace card, insight card, ticker tables, etc.) is the same React components at any width. Only the surrounding chrome differs:

- **Mobile (`< md`):** persistent bottom nav (Overview / Income / [FAB] / Bills / Trends), "More" sheet for Tags/Trips/Goals/Settings/Payments.
- **Desktop (`md+`):** existing left sidebar with the same nav order. No bottom nav. No floating FAB — "Add expense" is the gradient button at the top of the sidebar (already there).
- Page content max-width on desktop: `max-w-3xl` centered. On mobile, full-width with `px-3.5`.

No two-column desktop layouts in V1 — the cards stack the same way and just have more breathing room on a wide screen.

## Information architecture

### Two-layer nav (Credit-Karma style)

**Bottom nav = top-level sections** (mobile). **Top sub-tabs = scoped sub-views inside the active section**. Top sub-tabs only render when the active section has 2+ sub-views; sections with one view show no top tabs.

### Bottom nav (new order)

```
[ Home ]  [ Wallet ]   [ + ]   [ Receipt ]  [ PieChart ]
 Overview   Income     FAB       Bills        Trends
```

- FAB stays as center "Add expense" trigger (unchanged behavior — opens the existing `AddExpenseDrawer`)
- Tiny progress ticks above the nav: `→ → →` to reinforce lifecycle
- Trips / Tags / Goals / Settings / Payments move behind a top-right **⋯ menu** (button at the top of the page next to a 🔔 notifications icon)
- Active item: accent-colored icon + bold label

### Top sub-tabs (per section)

| Section | Sub-tabs |
|---|---|
| Overview | Today · Allocations · Daily pace · **Expenses** |
| Income   | (none — single view) |
| Bills    | All · Overdue · Recurring · Paid · **Calendar** |
| Trends   | Insights · Categories · Compare |

- Strip sits below the page header, above the page content
- Active tab has a gradient underline (`background: linear-gradient(90deg, #f59e0b, #ec4899)`)
- Tab strip is horizontally scrollable when overflowed (mobile)
- Sections with no sub-tabs hide the strip entirely (Income, Payments)
- Active sub-tab persists in URL: `?sub=expenses`, `?sub=calendar`, etc. Default = first tab when missing.

### Top action chips (right side of header)

- 🔔 Notifications (placeholder — opens an empty sheet for now; future: bill reminders, expense alerts)
- ⋯ More (opens slide-up sheet with Payments / Tags / Trips / Goals / Settings)

### Desktop sidebar (mirrors the nav)

Sidebar order on `md+`:
```
[Add Expense gradient button]
─ Top-level ─
Overview · Income · Bills · Trends
─ More ─
Payments · Tags · Trips · Goals
─ (pinned bottom) ─
Settings
```

Top sub-tabs render the same way on desktop (inside the page, not the sidebar).

### Shared context strip (THE flow fix)

Renders at the top of every one of the 4 core pages, right under the page header. 4-column grid of buttons:

| col | label | value | sub | tap → |
|-----|-------|-------|-----|-------|
| 1 | SPENT | `$3,425` | `this month` | /trends |
| 2 | PROJECTED | `$6,634` | `on track` or `over budget` | /trends |
| 3 | INCOME | `$6,800` | `budget` | /income |
| 4 | BILLS DUE | `3` | `this week` | /bills |

- Numbers are color-coded by tone (`good`/`bad`/`warn`/`neutral`)
- Same numbers on every page — fixed the "4 separate apps" problem
- All values mono-spaced, tabular-nums

### Page header (every page)

```
{KICKER}                       [<  May 2026  >]
{PAGE TITLE}
{optional subtitle}
```

- Kicker: small uppercase eyebrow (`easyBudget` on Overview; specific subtitle on others)
- Month switcher (existing `MonthSwitcher`) moves to top-right as a pill

## Pages

### Overview

- **Header:** "Overview" / "Day 16 of 31 · 52% through month"
- **Context strip**
- **Hero card** — "Available to spend": large gradient amount, on-pace/off-pace pill, dual progress bar (actual + projection ghost + vertical today marker), `$X spent · $Y left | proj $Z` footer
- **Allocation grid** — 3 small cards (Savings / Bills / Wants) with name, % target, spent-of-allocated mono, mini progress bar
- **Daily pace card** — bold mono `$XXX / day average`, daily-spend bar histogram (real values past, ghost for future days, dashed avg line, gradient-fill on above-avg days)
- **Upcoming bills strip** — horizontal-scroll cards of next 3 unpaid bills with icon, name, amount, "in Xd" / "Xd late"
- **Recent expenses** — list of 6 most recent, each: lucide icon in colored tile, name, `category · date`, mono amount with `−`

### Income

- **Header:** "Income" / "Earnings this month"
- **Context strip**
- **Hero card** — "Budget total" big gradient amount, stacked bar (Arrived solid + Expected striped pattern), legend below
- **Entries card** — header row with "ENTRIES" / "STATUS · AMOUNT"; each row: lucide icon (`checkCircle` for arrived, `calendar` for expected), source, date, right column shows uppercase status tag (green for ARRIVED, amber for EXPECTED) above the amount in matching color
- **Add row** — dashed-top full-width button inside the same card, "+ Add income entry"
- **Goes to → card** — soft violet tinted card: "After bills $X you'll have $Y left for savings + wants." with a link to /bills

### Bills

- **Header:** "Bills" / "Recurring and one-time"
- **Context strip**
- **Hero card** — "Outstanding" gradient amount, overdue pill if any
- **Due-date calendar** — horizontal track with vertical marker for each bill colored by status (red overdue, amber due-soon, white upcoming, dimmed muted paid); today tick + "today" label
- **Breakdown chips** — three side-by-side small tiles: Overdue ($X), This week ($Y), Upcoming ($Z) — color-tinted
- **Grouped bill lists** — 4 sections: Overdue (hidden if empty) / This week / Later / Paid
  - Each section header: colored label (red/amber/muted/green) + count + total
  - Each row: small colored icon tile, name, "due May X" / "Xd late" / "paid May X", mono amount (line-through + opacity if paid)

### Overview → Expenses sub-tab (new)

Promoted from `/expenses` into the Overview section as a top sub-tab. Renders the full recent-expense list scoped to the current month.

- **Hero:** "Recent expenses" eyebrow, total dollar amount this week as gradient text, count + period as caption
- **Filter chips strip** (horizontally scrollable): `All · Today · This week · By category · By card`
  - `All` is the default; ships only this filter in V1
  - `Today` / `This week` filter by date
  - `By category` / `By card` group the list rather than filter — fold-out groupings, V2
- **Expense list:** same `<IconTile>` + name + `category · date` + mono amount as the Overview "Recent" component
- Pagination: scroll-to-load, 50 at a time (or just render all if the user has fewer than 100 this month)
- Tap any row → existing `/expenses/[id]/edit` page

### Bills → Calendar sub-tab (new)

Full-month calendar grid showing every bill due date for the selected month, plus a list of upcoming bills below.

- **Hero:** "{Month} bills due" eyebrow, total dollar amount across the visible month, gradient text
- **Calendar grid:** 7-column (S-M-T-W-T-F-S header), each day rendered as a circle
  - Days with bills due: filled gradient circle, day number in white, bold
  - Past days with bills: dimmed gradient (`opacity: 0.4`)
  - Today: 1.5px gold ring outline
  - Empty days: plain day number, no background
  - Multiple bills on same day: just one circle; tap → expands the bills-list section to show that day's bills
- **Legend below grid:** "Today" (gold ring), "Upcoming" (gradient circle)
- **Month switcher pills:** `[Mar] [Apr] [May]` 3-month window centered on selected month; tap navigates
- **Upcoming bills list** below: same `<IconTile>` + name + date + amount as the Bills page sections, but only future (non-paid) bills
- Tap a bill row → opens `/bills/[id]/edit`

### Trends

- **Header:** "Trends" / "How this month compares"
- **Context strip**
- **Insight card** — small card with colored LEFT border (red if over pace, green if under), uppercase "INSIGHT" eyebrow, body sentence: "At today's pace you'll spend $X this month — N% more/less than April ($Y). [Dining is the biggest mover, up 34% vs last month.]"
- **Income vs Spend chart**
  - Range toggle pills `6m / 12m / YTD`
  - Inline Chart-style switcher: `Area / Line / Bar` (writes back to global preference; see Spec #3)
  - 6 data points (or N), Y-axis with $ ticks, gridlines, X-axis month labels
  - Projection: dashed line extension from current month to PROJECTED_TOTAL, with a small outlined circle at the projected point
  - Legend row: Income / Spend / Projected (dashed)
- **Categories — biggest movers** — same ticker table we built, but sorted by |Δ%| desc (instead of by `currentTotal`). Sparkline color = red if up, green if down. Mono numbers throughout.

### Add Expense drawer

- Drag handle bar at top
- Big gradient amount as the focus (centered, ~48px)
- "What was this for?" input
- 3 bucket buttons (Savings / Bills / Wants) — selected one tinted purple
- "Paid with" row — pill chips (Cash / Debit / Chase CC / + New) with one selected
- Full-width gradient "Save expense" button

## Visual tokens (override existing where applicable)

Existing tokens like `bg-bg-deep`, `text-foreground`, `text-muted-base` stay. The design adds:

```ts
// Gradient theme (default)
accent:        #f59e0b
accent2:       #ec4899
gradient:      linear-gradient(90deg, #f59e0b 0%, #ec4899 100%)
bucketColors:  { savings: #f59e0b, bills: #ec4899, wants: #a78bfa }
heroGlow:      radial fades top/bottom

// Status
green:         #34d399
red:           #f87171
amber:         #fbbf24

// Type
font:          'Geist'
mono:          'Geist Mono'

// Card chrome
card:          #181028
cardSoft:      rgba(255,255,255,0.025)
cardEdge:      rgba(167,139,250,0.10)
border:        rgba(167,139,250,0.13)
muted:         #8a7da8
mutedDim:      #5e5279
```

### Mint theme — REMOVED

The hybrid had an optional mint theme as a tweaks-panel toggle. **Dropped** in this revision — gradient is the only theme. No theme picker, no localStorage, no `data-color-scheme` attribute. One CSS path.

## Components — file map

```
components/layout/bottom-nav.tsx                 # rewrite — new order + tick row above
components/layout/context-strip.tsx              # NEW client — 4-col strip with onNav
components/layout/page-header.tsx                # NEW server — kicker + title + month switcher
components/dashboard/hero-available-card.tsx     # NEW — Overview hero with dual progress + on-pace pill
components/dashboard/allocation-grid.tsx         # NEW — 3-tile bucket allocation cards
components/dashboard/daily-pace-card.tsx         # NEW client — daily-spend bar histogram
components/dashboard/upcoming-bills-strip.tsx    # rewrite — horizontal-scroll cards
components/dashboard/recent-list.tsx             # rewrite — lucide icons in colored tiles
components/overview/expenses-tab.tsx             # NEW client — Expenses sub-tab content (hero + filter chips + list)
components/layout/top-tabs.tsx                   # NEW client — sub-tab strip; reads ?sub from URL
components/layout/top-action-chips.tsx           # NEW client — 🔔 + ⋯ icon buttons in the header
components/layout/more-sheet.tsx                 # NEW client — slide-up sheet with Payments/Tags/Trips/Goals/Settings
components/income/income-hero.tsx                # NEW — Budget total + stacked Arrived/Expected
components/income/entry-row.tsx                  # rewrite — status column + colored amount
components/income/goes-to-card.tsx               # NEW — "After bills X you'll have Y"
components/bills/bills-hero.tsx                  # NEW — Outstanding + due-date timeline strip + chips
components/bills/bills-group.tsx                 # rewrite — tone-colored grouped list
components/bills/bills-calendar.tsx              # NEW — Calendar sub-tab: grid + month pills + upcoming list
components/trends/insight-card.tsx               # NEW — left-border colored insight
components/trends/chart-style-switcher.tsx       # NEW client — Area/Line/Bar pills
components/trends/monthly-area-chart.tsx         # extend — add Line/Bar modes + projection dot
components/trends/category-ticker-table.tsx      # tweak — sort by |Δ%| desc on Trends only
lib/actions/forecast.ts                          # NEW — projection helpers (linear pace) and pace status
app/(app)/page.tsx                               # rewrite — new Overview
app/(app)/income/page.tsx                        # rewrite — new Income
app/(app)/bills/page.tsx                         # rewrite — new Bills
app/(app)/trends/page.tsx                        # rewrite — new Trends (keeps tabs internally? See decision below)
```

### Decision: trends tabs

The hybrid design shows Trends as **single scrolling page**, not tabbed. The current `/trends` has 3 tabs (Overview / Categories / Trips). For this spec:

- **Drop the trends tabs.** The hybrid puts Insight + Chart + Categories all on one screen, in that order. Trips moves to its own `/trips` page (already exists).
- **Keep the Daily/Monthly category-view toggle** (we just shipped it). Pin it above the categories table.

### Lucide icons replace emoji on bills, recent expenses, income entries, category rows

- Use icons from `lucide-react` (already a dep)
- Map `bills.type` → icon (utility=Wifi, subscription=Film, credit_card=CreditCard, loan=Landmark, other=Receipt)
- Map `tag.name` → icon for common defaults (Food=UtensilsCrossed, Groceries=ShoppingBag, etc.); fall back to `Tag` icon for unmapped
- Each icon sits in a small `bg-accent-purple/10` tile (28×28 or 30×30), `text-accent-purple-light`
- Tag.emoji stays in the DB but stops being rendered in trends/dashboard surfaces — the tags page still shows + edits it

## Forecast helpers (`lib/actions/forecast.ts`)

Pure functions (no DB beyond what's already fetched on the page). Live in actions for type colocation.

```ts
export function dailyPace(spent: number, dayOfMonth: number): number;       // spent / dayOfMonth
export function projectedTotal(spent: number, dayOfMonth: number, daysInMonth: number): number;  // linear
export function paceStatus(projected: number, budget: number): "good" | "bad";
export function daysIntoMonth(date: Date): { day: number; total: number; pctThroughMonth: number };
```

These keep the projection math consistent across hero card, context strip, insight, and chart projection extension.

## Forecast definition (locked)

**Linear pace projection** — `projected = (spent / dayOfMonth) × daysInMonth`. Simple, transparent, no historical baseline needed. Future: exponential smoothing.

## Edge cases

- First day of month (dayOfMonth = 1, spent = 0) → projected = 0, status = "good", no pace marker (or marker at 100% of left edge)
- No income set → context strip "Income" cell shows "—" and "Set income"; projection still shown
- Empty bills → calendar bar empty; sections collapse with the existing `emptyHide` pattern
- Trends Insight card with no last-month data → fall back to "Spending steady. You've used X% of your monthly target." (already in `getHeadlineInsight`)
- Mint theme + over-budget red bars → red still reads on dark mint background; not a contrast issue

## Out of scope

- No two-column / dashboard-grid desktop layout (cards stack same as mobile, just narrower max-width)
- No removing emoji from Tags page (only the dashboard/feed surfaces switch to lucide)
- No re-architecting the existing `useActionState` / drawer patterns — they keep working
- No new server actions beyond `forecast.ts` (everything else reads existing actions)
- Trends `/trends` no longer has tab routing or `?range=`; range toggle becomes local component state OR keeps URL state (decide in plan — leaning local state to simplify)
- No haptic feedback / sound

## Acceptance criteria

- All 4 mobile pages share the same context strip (same numbers, same layout)
- Bottom nav order is Overview → Income → [FAB] → Bills → Trends; "More" reachable via top-right ⋯
- Top sub-tab strip renders on Overview / Bills / Trends; hidden on Income (single view)
- URL persists active sub-tab as `?sub=...`
- Overview → Expenses sub-tab renders the recent-expense list with at least the `All` filter chip working
- Bills → Calendar sub-tab renders a full month grid with gradient dots on bill days, gold ring on today, and month switcher pills
- Daily-pace card on Overview shows histogram with ghost future days + dashed avg
- Trends page has insight card with left-border tone and chart-style switcher
- Production build clean; no Recharts (already removed)
- Renders correctly at both `< md` (bottom-nav shell) and `md+` (sidebar shell) without per-component branching beyond the layout shell itself
