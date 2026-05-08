# Bills, Income & Goals — Design Spec

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extend EasyBudget with richer Bills/Subscriptions management, structured Income tracking, and a three-pot Goals & Savings allocation system.

**Architecture:** Schema additions + new server actions + new pages/components layered onto the existing Next.js 15 App Router + Drizzle ORM stack. No new external dependencies required.

---

## 1. Bills & Subscriptions

### 1.1 Schema Changes

**New table: `creditCards`**
```ts
creditCards = pgTable("credit_cards", {
  id:     serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name:   text("name").notNull(),          // e.g. "Chase Sapphire", "Discover"
  dueDay: integer("due_day").notNull(),    // 1–31
})
```

**Modified table: `bills`** — add columns:
- `frequency`: `text` typed as `"monthly" | "yearly"`, default `"monthly"`
- `renewalMonth`: `integer` (1–12), nullable — only set when `frequency = "yearly"`
- `renewalDay`: `integer` (1–31), nullable — only set when `frequency = "yearly"`
- `description`: `text`, nullable
- `creditCardId`: `integer` FK → `creditCards.id`, nullable (set when `type = "subscription"` and user selects a card)

**Existing `dueDay` column** is kept for monthly bills. For yearly bills, `renewalMonth` + `renewalDay` are used instead; `dueDay` is stored as `renewalDay` for simplicity (same column, different semantic when frequency=yearly).

### 1.2 Bills Page (`/bills`)

- Lists all active bills ordered by: monthly bills by `dueDay` asc, yearly bills by `renewalMonth` asc then `renewalDay` asc
- Each row shows:
  - Type icon + name
  - For monthly: "Due day {dueDay} · Monthly"
  - For yearly: "Renews {Month} {day} · Yearly"
  - If `creditCardId` set: a `💳 {cardName}` badge
  - Description shown as small muted text below the name (if present)
  - Amount
  - ✏️ Edit button → navigates to `/bills/[id]/edit`
  - 🗑 Delete button (soft delete, sets `active = false`)

### 1.3 Add / Edit Bill Form

Single form component `BillForm` used for both create (`/bills/new`) and edit (`/bills/[id]/edit`).

**Fields:**
1. **Name** — text, required
2. **Amount (USD)** — number, required
3. **Description** — text, optional
4. **Frequency** — toggle: Monthly | Yearly
   - Monthly → show **Due Day** (1–31)
   - Yearly → show **Renewal Month** (select Jan–Dec) + **Renewal Day** (1–31)
5. **Type** — select: Subscription | Utility | Credit Card | Loan | Other
   - When type = `subscription` → show **Credit Card** picker (dropdown of user's saved cards + "None")
6. **Reminder days before** — number, default 3
7. Submit button

**Server actions needed:**
- `createBill(data)` — updated to accept new fields
- `updateBill(id, data)` — new
- `deleteBill(id)` — existing (soft delete)

### 1.4 Settings Page — Credit Cards Section

New section on the existing `/settings` page (or create `/settings` if it doesn't exist).

- Lists user's credit cards: name + due day + delete button
- Inline add form: name field + due day field + "Add Card" button
- Server actions: `createCreditCard(data)`, `deleteCreditCard(id)`

### 1.5 Upcoming Bills Strip Update

`getUpcomingBills()` updated to handle yearly bills:
- For yearly bills, upcoming = `renewalMonth === currentMonth && renewalDay - today <= daysAhead`
- Monthly bills unchanged

---

## 2. Income Tracking

### 2.1 Schema

**New table: `incomeSources`** — templates for recurring income
```ts
incomeSources = pgTable("income_sources", {
  id:        serial("id").primaryKey(),
  userId:    text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name:      text("name").notNull(),                        // e.g. "Employer X", "Freelance"
  amount:    real("amount").notNull(),
  frequency: text("frequency").$type<"biweekly" | "monthly" | "one_time">().notNull(),
  active:    boolean("active").notNull().default(true),
})
```

**New table: `incomeEntries`** — per-month occurrences
```ts
incomeEntries = pgTable("income_entries", {
  id:           serial("id").primaryKey(),
  userId:       text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sourceId:     integer("source_id").references(() => incomeSources.id, { onDelete: "set null" }),
  monthId:      integer("month_id").notNull().references(() => months.id, { onDelete: "cascade" }),
  name:         text("name").notNull(),                     // snapshot of source name at entry time
  amount:       real("amount").notNull(),
  status:       text("status").$type<"expected" | "might_arrive" | "arrived">().notNull().default("expected"),
  expectedDate: date("expected_date").notNull(),
  arrivedDate:  date("arrived_date"),                       // nullable, set when marked arrived
})
```

### 2.2 Monthly Income Logic

When `getOrCreateMonth()` is called for a new month:
1. Load all active `incomeSources` for the user
2. For each source, generate `incomeEntries` for that month:
   - `monthly` → one entry, `expectedDate = first day of month`
   - `biweekly` → two entries per month, `expectedDate` = 1st and 15th of the month
   - `one_time` → not auto-generated (added manually)
3. Entries are only generated if none exist yet for that `monthId` + `sourceId` pair

**Income totals for budget math:**
- **Budget total** = sum of `arrived` + `expected` entries for the month
- **Actual balance** = sum of `arrived` entries only
- **Possible** = sum of `might_arrive` entries (shown separately, not counted in either total)

### 2.3 Overdue Prompt

On the home dashboard and income page: if today's date > `expectedDate` and status is still `expected`, show a dismissable banner per overdue entry:

> "Did your **$2,000** from **Employer X** arrive? It was expected on May 1."
> [**Yes, it arrived**] [**No, remove it**]

- "Yes" → sets `status = "arrived"`, `arrivedDate = today`
- "No, remove it" → sets `status = "might_arrive"` (stays visible as possible, not in budget total) OR deletes the entry — user's choice. Spec decision: **set to `might_arrive`** so the amount is still visible but not counted.

### 2.4 Income Page (`/income`)

New route in the app shell nav (between Home and Bills).

**Layout:**
- Header: "Income — {Month Year}" with month switcher
- Overdue banners (if any) at top
- Income entries list grouped by source name:
  - Each entry: source name + frequency label + expected date + amount + status badge
  - Status badges: 🟢 Arrived, 🟡 Expected, ⚪ Might Arrive
  - Tap entry to change status (arrived / might_arrive) or edit amount
- Summary footer:
  - **Budget total** (arrived + expected): highlighted
  - **Actual balance** (arrived only): secondary
  - **+ Possible** (might_arrive): muted
- "+ Add Income" button → opens form to add a one-time entry or create a new source

**Income source management:**
- "+ Add Income" opens a form: name, amount, frequency (biweekly / monthly / one-time), expected date (for one-time) or "auto-generate" (for recurring)
- Creating a recurring source saves to `incomeSources` and auto-generates entries for the current month

**Server actions needed:**
- `getIncomeEntries(monthId)` — returns entries with source info
- `createIncomeSource(data)` — saves source + generates entries for current month
- `updateIncomeEntryStatus(id, status)` — marks arrived/might_arrive
- `deleteIncomeEntry(id)` — for manual removal

### 2.5 Dashboard Hero Card Update

Replace single `income` field display with:
- **Budget total** (arrived + expected) — primary number
- **Actual** — secondary smaller number below it
- "+${possible} possible" — muted, only shown if > 0

---

## 3. Goals & Savings Allocation

### 3.1 Budget Pots

Three fixed pots replacing current savings/wants/bills:
- **Savings** (was `savingsPct`)
- **Bills** (was `billsPct`)
- **Personal** (was `wantsPct` — rename in schema display only, column stays `wants_pct` to avoid migration complexity)

UI throughout the app renames "Wants" → "Personal". No schema column rename needed.

### 3.2 Schema

**New table: `savingsAllocations`**
```ts
savingsAllocations = pgTable("savings_allocations", {
  id:         serial("id").primaryKey(),
  userId:     text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name:       text("name").notNull(),        // e.g. "Roth IRA", "Emergency Fund", "Vacation"
  percentage: integer("percentage").notNull(), // must sum to 100 across user's allocations
  sortOrder:  integer("sort_order").notNull().default(0),
})
```

Validation: before saving, sum all user's allocations including the new/updated one — reject if total > 100, warn if < 100.

### 3.3 Goals / Savings Page (`/goals`)

**Layout:**

**Top section — Three Pots**
- Three cards: Savings | Bills | Personal
- Each shows: pot name, percentage, computed dollar amount (pot% × budget total income)
- "Edit %" button → opens allocation % editor (same as existing month allocation UI)

**Middle section — Savings Allocation**
- Title: "Where does your savings go?"
- List of `savingsAllocations`: name + % + computed dollar amount this month
- Computed amount = (savings pot $) × (allocation %)
- Editable inline: click % to change
- Validation indicator: "X% allocated" — green if 100%, yellow if under, red if over
- "+ Add destination" button → inline form: name + %

**Server actions needed:**
- `getSavingsAllocations()` — returns user's allocations
- `createSavingsAllocation(data)` — validates sum ≤ 100
- `updateSavingsAllocation(id, data)` — validates sum ≤ 100
- `deleteSavingsAllocation(id)`

### 3.4 Dashboard Update

Allocation card on home dashboard updated:
- Show "Savings / Bills / Personal" (not "Savings / Bills / Wants")
- Savings card: on tap/expand → shows allocation destinations with amounts

---

## 4. Navigation Updates

- Add **Income** to bottom nav and sidebar (between Home and Bills)
- Add **Goals** to bottom nav and sidebar (after Bills)
- Settings link already in nav — ensure it exists and routes to `/settings`

---

## 5. File Map (new/modified)

```
New files:
  app/(app)/income/page.tsx
  app/(app)/goals/page.tsx
  app/(app)/bills/[id]/edit/page.tsx
  app/(app)/settings/page.tsx              # if not already present
  components/income/income-entry-list.tsx
  components/income/income-form.tsx
  components/income/overdue-banner.tsx
  components/goals/savings-allocation-list.tsx
  components/bills/bill-form.tsx           # replaces inline form in new/page.tsx
  lib/actions/income.ts
  lib/actions/goals.ts
  lib/actions/credit-cards.ts

Modified files:
  lib/db/schema.ts                         # new tables
  lib/actions/bills.ts                     # updateBill, createBill updated
  lib/actions/months.ts                    # income entry generation on month create
  components/dashboard/hero-card.tsx       # budget total + actual balance
  components/dashboard/allocation-card.tsx # rename Wants → Personal
  components/dashboard/upcoming-bills-strip.tsx  # yearly bill support
  components/layout/sidebar.tsx            # add Income + Goals links
  components/layout/bottom-nav.tsx         # add Income + Goals links
  app/(app)/bills/page.tsx                 # edit button, new columns
  app/(app)/bills/new/page.tsx             # use BillForm component
```
