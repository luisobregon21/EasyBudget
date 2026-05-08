# Bills, Income & Goals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add yearly subscriptions with credit card tracking, structured income tracking with overdue prompts, and a three-pot savings allocation system to EasyBudget.

**Architecture:** Schema additions via Drizzle (new `creditCards`, `incomeSources`, `incomeEntries`, `savingsAllocations` tables + `bills` column additions), new server actions, new pages (`/income`, `/goals`, `/bills/[id]/edit`, `/settings`), and updates to existing dashboard components and nav. All mutations use Next.js server actions. No new npm packages needed.

**Tech Stack:** Next.js 15 App Router, Drizzle ORM, `@neondatabase/serverless`, TypeScript, Tailwind CSS, shadcn/ui, Auth.js v5 (JWT)

**Spec:** `docs/superpowers/specs/2026-05-08-bills-income-goals-design.md`

---

## File Map

```
New files:
  lib/actions/credit-cards.ts              # createCreditCard, getCreditCards, deleteCreditCard
  lib/actions/income.ts                    # getIncomeEntries, createIncomeSource, updateIncomeEntryStatus, deleteIncomeEntry, generateMonthIncomeEntries
  lib/actions/goals.ts                     # getSavingsAllocations, createSavingsAllocation, updateSavingsAllocation, deleteSavingsAllocation
  components/bills/bill-form.tsx           # shared form for create + edit
  components/income/overdue-banner.tsx     # per-entry overdue prompt
  components/income/income-entry-list.tsx  # grouped list + status badges
  components/income/income-form.tsx        # add income source / one-time entry
  components/goals/savings-allocation-list.tsx  # allocation rows + % editor
  app/(app)/income/page.tsx
  app/(app)/goals/page.tsx
  app/(app)/bills/[id]/edit/page.tsx
  app/(app)/settings/page.tsx

Modified files:
  lib/db/schema.ts                         # new tables + bills columns
  lib/actions/bills.ts                     # updateBill + updated createBill
  lib/actions/months.ts                    # call generateMonthIncomeEntries on create
  components/dashboard/hero-card.tsx       # budget total + actual balance display
  components/dashboard/allocation-card.tsx # rename "wants" → "personal" in UI
  components/dashboard/upcoming-bills-strip.tsx  # yearly bill support
  components/layout/sidebar.tsx            # add Income nav link
  components/layout/bottom-nav.tsx         # add Income nav link
  app/(app)/bills/page.tsx                 # edit button, new columns display
  app/(app)/bills/new/page.tsx             # use BillForm component
  app/(app)/page.tsx                       # pass income totals to HeroCard
```

---

## Task 1: Schema — New Tables + Bills Columns

**Files:**
- Modify: `lib/db/schema.ts`

- [ ] **Step 1: Add new tables and columns to schema**

Replace the contents of `lib/db/schema.ts` with:

```ts
import {
  pgTable, text, integer, real, boolean,
  timestamp, date, primaryKey, serial, index
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { AdapterAccount } from "@auth/core/adapters";

// ── Auth.js required tables ──────────────────────────────────────────────────

export const users = pgTable("users", {
  id:            text("id").notNull().primaryKey().default(sql`gen_random_uuid()`),
  name:          text("name"),
  email:         text("email").notNull(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image:         text("image"),
  password:      text("password"),
});

export const accounts = pgTable("accounts", {
  userId:            text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type:              text("type").$type<AdapterAccount["type"]>().notNull(),
  provider:          text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  refresh_token:     text("refresh_token"),
  access_token:      text("access_token"),
  expires_at:        integer("expires_at"),
  token_type:        text("token_type"),
  scope:             text("scope"),
  id_token:          text("id_token"),
  session_state:     text("session_state"),
}, (t) => ({
  pk: primaryKey({ columns: [t.provider, t.providerAccountId] }),
}));

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").notNull().primaryKey(),
  userId:       text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires:      timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable("verification_tokens", {
  identifier: text("identifier").notNull(),
  token:      text("token").notNull(),
  expires:    timestamp("expires", { mode: "date" }).notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.identifier, t.token] }),
}));

// ── App tables ───────────────────────────────────────────────────────────────

export const userSettings = pgTable("user_settings", {
  userId:            text("user_id").notNull().primaryKey().references(() => users.id, { onDelete: "cascade" }),
  defaultSavingsPct: integer("default_savings_pct").notNull().default(20),
  defaultWantsPct:   integer("default_wants_pct").notNull().default(10),
  defaultBillsPct:   integer("default_bills_pct").notNull().default(70),
});

export const months = pgTable("months", {
  id:             serial("id").primaryKey(),
  userId:         text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  year:           integer("year").notNull(),
  month:          integer("month").notNull(),
  income:         real("income").notNull().default(0),
  openingBalance: real("opening_balance").notNull().default(0),
  savingsPct:     integer("savings_pct").notNull().default(20),
  wantsPct:       integer("wants_pct").notNull().default(10),
  billsPct:       integer("bills_pct").notNull().default(70),
}, (t) => ({
  uniq: index("months_user_year_month_idx").on(t.userId, t.year, t.month),
}));

export const tags = pgTable("tags", {
  id:            serial("id").primaryKey(),
  userId:        text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name:          text("name").notNull(),
  emoji:         text("emoji").notNull().default("🏷️"),
  color:         text("color").notNull().default("#a78bfa"),
  defaultBucket: text("default_bucket").$type<"savings" | "bills" | "wants">().notNull().default("wants"),
});

export const trips = pgTable("trips", {
  id:              serial("id").primaryKey(),
  userId:          text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name:            text("name").notNull(),
  destination:     text("destination").notNull(),
  startDate:       date("start_date").notNull(),
  endDate:         date("end_date").notNull(),
  budgetUsd:       real("budget_usd").notNull(),
  primaryCurrency: text("primary_currency").notNull().default("USD"),
});

export const expenses = pgTable("expenses", {
  id:            serial("id").primaryKey(),
  userId:        text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  monthId:       integer("month_id").notNull().references(() => months.id, { onDelete: "cascade" }),
  amount:        real("amount").notNull(),
  currency:      text("currency").notNull().default("USD"),
  amountUsd:     real("amount_usd").notNull(),
  exchangeRate:  real("exchange_rate").notNull().default(1),
  description:   text("description").notNull(),
  date:          date("date").notNull(),
  paymentMethod: text("payment_method").$type<"cash" | "debit" | "credit_card">().notNull(),
  bucket:        text("bucket").$type<"savings" | "bills" | "wants">().notNull(),
  tagId:         integer("tag_id").references(() => tags.id, { onDelete: "set null" }),
  tripId:        integer("trip_id").references(() => trips.id, { onDelete: "set null" }),
  createdAt:     timestamp("created_at").notNull().defaultNow(),
});

// NEW: credit cards owned by user
export const creditCards = pgTable("credit_cards", {
  id:     serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name:   text("name").notNull(),   // e.g. "Chase Sapphire", "Discover"
  dueDay: integer("due_day").notNull(),
});

export const bills = pgTable("bills", {
  id:                 serial("id").primaryKey(),
  userId:             text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name:               text("name").notNull(),
  amount:             real("amount").notNull(),
  dueDay:             integer("due_day").notNull().default(1),
  frequency:          text("frequency").$type<"monthly" | "yearly">().notNull().default("monthly"),
  renewalMonth:       integer("renewal_month"),   // 1–12, yearly only
  renewalDay:         integer("renewal_day"),     // 1–31, yearly only
  description:        text("description"),
  type:               text("type").$type<"utility" | "subscription" | "credit_card" | "loan" | "other">().notNull(),
  creditCardId:       integer("credit_card_id").references(() => creditCards.id, { onDelete: "set null" }),
  reminderDaysBefore: integer("reminder_days_before").notNull().default(3),
  active:             boolean("active").notNull().default(true),
});

// NEW: recurring income templates
export const incomeSources = pgTable("income_sources", {
  id:        serial("id").primaryKey(),
  userId:    text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name:      text("name").notNull(),
  amount:    real("amount").notNull(),
  frequency: text("frequency").$type<"biweekly" | "monthly" | "one_time">().notNull(),
  active:    boolean("active").notNull().default(true),
});

// NEW: per-month income occurrences
export const incomeEntries = pgTable("income_entries", {
  id:           serial("id").primaryKey(),
  userId:       text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sourceId:     integer("source_id").references(() => incomeSources.id, { onDelete: "set null" }),
  monthId:      integer("month_id").notNull().references(() => months.id, { onDelete: "cascade" }),
  name:         text("name").notNull(),
  amount:       real("amount").notNull(),
  status:       text("status").$type<"expected" | "might_arrive" | "arrived">().notNull().default("expected"),
  expectedDate: date("expected_date").notNull(),
  arrivedDate:  date("arrived_date"),
});

// NEW: savings allocation destinations
export const savingsAllocations = pgTable("savings_allocations", {
  id:         serial("id").primaryKey(),
  userId:     text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name:       text("name").notNull(),
  percentage: integer("percentage").notNull(),
  sortOrder:  integer("sort_order").notNull().default(0),
});
```

- [ ] **Step 2: Push schema to database**

```bash
npx dotenv -e .env.local -- npx drizzle-kit push
```

Expected: output shows new tables `credit_cards`, `income_sources`, `income_entries`, `savings_allocations` created; `bills` table altered to add new columns. No errors.

- [ ] **Step 3: Commit**

```bash
git add lib/db/schema.ts
git commit -m "feat: extend schema for credit cards, income, bills updates, savings allocations"
```

---

## Task 2: Credit Cards Server Actions + Settings Page

**Files:**
- Create: `lib/actions/credit-cards.ts`
- Create: `app/(app)/settings/page.tsx`

- [ ] **Step 1: Create credit cards actions**

Create `lib/actions/credit-cards.ts`:

```ts
"use server";
import { getDb, creditCards } from "@/lib/db";
import { and, eq, asc } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";

export async function getCreditCards() {
  const user = await requireSession();
  const db = getDb();
  return db.select().from(creditCards)
    .where(eq(creditCards.userId, user.id!))
    .orderBy(asc(creditCards.name));
}

export async function createCreditCard(formData: FormData) {
  const user = await requireSession();
  const db = getDb();
  const name = (formData.get("name") as string).trim();
  const dueDay = parseInt(formData.get("dueDay") as string);
  if (!name || isNaN(dueDay) || dueDay < 1 || dueDay > 31) throw new Error("Invalid card data");
  await db.insert(creditCards).values({ userId: user.id!, name, dueDay });
  revalidatePath("/settings");
}

export async function deleteCreditCard(cardId: number) {
  const user = await requireSession();
  const db = getDb();
  await db.delete(creditCards)
    .where(and(eq(creditCards.id, cardId), eq(creditCards.userId, user.id!)));
  revalidatePath("/settings");
}
```

- [ ] **Step 2: Create settings page**

Create `app/(app)/settings/page.tsx`:

```tsx
import { getCreditCards, createCreditCard, deleteCreditCard } from "@/lib/actions/credit-cards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, CreditCard } from "lucide-react";

export default async function SettingsPage() {
  const cards = await getCreditCards();

  async function handleDeleteCard(cardId: number) {
    "use server";
    await deleteCreditCard(cardId);
  }

  return (
    <div className="space-y-8 max-w-lg">
      <div>
        <h2 className="text-foreground text-xl font-bold">Settings</h2>
        <p className="text-muted-base text-sm">Manage your account preferences</p>
      </div>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <CreditCard size={16} className="text-accent-purple-light" />
          <h3 className="text-foreground font-semibold">Credit Cards</h3>
        </div>

        <div className="rounded-2xl bg-white/[0.03] border border-accent-purple/10 divide-y divide-white/5">
          {cards.length === 0 && (
            <p className="text-muted-base text-sm text-center py-6">No credit cards added yet.</p>
          )}
          {cards.map((card) => (
            <div key={card.id} className="flex items-center justify-between p-4">
              <div>
                <p className="text-foreground font-medium">{card.name}</p>
                <p className="text-muted-base text-xs">Due day {card.dueDay}</p>
              </div>
              <form action={handleDeleteCard.bind(null, card.id)}>
                <button type="submit" className="text-muted-base hover:text-red-400 transition-colors">
                  <Trash2 size={15} />
                </button>
              </form>
            </div>
          ))}
        </div>

        <form action={createCreditCard} className="rounded-2xl bg-white/[0.03] border border-accent-purple/10 p-4 space-y-3">
          <p className="text-muted-base text-xs uppercase tracking-widest">Add a Card</p>
          <div className="flex gap-3">
            <div className="flex-1 space-y-1">
              <Label className="text-muted-base text-[10px] uppercase tracking-widest">Card Name</Label>
              <Input name="name" required placeholder="Chase Sapphire"
                className="bg-bg-deep border-accent-purple/20 text-foreground" />
            </div>
            <div className="w-24 space-y-1">
              <Label className="text-muted-base text-[10px] uppercase tracking-widest">Due Day</Label>
              <Input name="dueDay" type="number" min="1" max="31" required placeholder="15"
                className="bg-bg-deep border-accent-purple/20 text-foreground" />
            </div>
          </div>
          <Button type="submit" className="bg-gradient-brand text-white font-bold w-full">
            Add Card
          </Button>
        </form>
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Verify settings page loads**

Start dev server (`npm run dev`), navigate to `http://localhost:3000/settings`. Should show "No credit cards added yet." Add one — it should appear in the list. Delete it — it should disappear.

- [ ] **Step 4: Commit**

```bash
git add lib/actions/credit-cards.ts app/(app)/settings/page.tsx
git commit -m "feat: credit cards management on settings page"
```

---

## Task 3: Bills — BillForm Component + Edit Route + Updated Actions

**Files:**
- Create: `components/bills/bill-form.tsx`
- Create: `app/(app)/bills/[id]/edit/page.tsx`
- Modify: `lib/actions/bills.ts`
- Modify: `app/(app)/bills/new/page.tsx`
- Modify: `app/(app)/bills/page.tsx`

- [ ] **Step 1: Update bills server actions**

Replace `lib/actions/bills.ts` with:

```ts
"use server";
import { getDb, bills, creditCards } from "@/lib/db";
import { and, eq, asc } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";

export async function getUserBills() {
  const user = await requireSession();
  const db = getDb();
  const rows = await db
    .select({
      id: bills.id,
      name: bills.name,
      amount: bills.amount,
      dueDay: bills.dueDay,
      frequency: bills.frequency,
      renewalMonth: bills.renewalMonth,
      renewalDay: bills.renewalDay,
      description: bills.description,
      type: bills.type,
      creditCardId: bills.creditCardId,
      creditCardName: creditCards.name,
      reminderDaysBefore: bills.reminderDaysBefore,
      active: bills.active,
    })
    .from(bills)
    .leftJoin(creditCards, eq(bills.creditCardId, creditCards.id))
    .where(and(eq(bills.userId, user.id!), eq(bills.active, true)))
    .orderBy(asc(bills.frequency), asc(bills.renewalMonth), asc(bills.renewalDay), asc(bills.dueDay));
  return rows;
}

export async function getBillById(billId: number) {
  const user = await requireSession();
  const db = getDb();
  const rows = await db.select().from(bills)
    .where(and(eq(bills.id, billId), eq(bills.userId, user.id!)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getUpcomingBills(daysAhead = 7) {
  const user = await requireSession();
  const db = getDb();
  const today = new Date();
  const todayDay = today.getDate();
  const todayMonth = today.getMonth() + 1;

  const allBills = await db
    .select({
      id: bills.id,
      name: bills.name,
      amount: bills.amount,
      dueDay: bills.dueDay,
      frequency: bills.frequency,
      renewalMonth: bills.renewalMonth,
      renewalDay: bills.renewalDay,
      type: bills.type,
    })
    .from(bills)
    .where(and(eq(bills.userId, user.id!), eq(bills.active, true)));

  return allBills.filter((b) => {
    if (b.frequency === "yearly") {
      if (b.renewalMonth !== todayMonth) return false;
      const daysUntil = (b.renewalDay ?? 1) - todayDay;
      return daysUntil >= 0 && daysUntil <= daysAhead;
    }
    const daysUntil = b.dueDay >= todayDay
      ? b.dueDay - todayDay
      : 31 - todayDay + b.dueDay;
    return daysUntil <= daysAhead;
  });
}

function parseBillFormData(formData: FormData) {
  const frequency = formData.get("frequency") as "monthly" | "yearly";
  const type = formData.get("type") as "utility" | "subscription" | "credit_card" | "loan" | "other";
  const creditCardIdRaw = formData.get("creditCardId") as string;
  const creditCardId = creditCardIdRaw && creditCardIdRaw !== "none"
    ? parseInt(creditCardIdRaw)
    : null;

  return {
    name: (formData.get("name") as string).trim(),
    amount: parseFloat(formData.get("amount") as string),
    description: (formData.get("description") as string)?.trim() || null,
    frequency,
    dueDay: frequency === "monthly" ? parseInt(formData.get("dueDay") as string) : 1,
    renewalMonth: frequency === "yearly" ? parseInt(formData.get("renewalMonth") as string) : null,
    renewalDay: frequency === "yearly" ? parseInt(formData.get("renewalDay") as string) : null,
    type,
    creditCardId: type === "subscription" ? creditCardId : null,
    reminderDaysBefore: parseInt((formData.get("reminderDaysBefore") as string) || "3"),
  };
}

export async function createBill(formData: FormData) {
  const user = await requireSession();
  const db = getDb();
  await db.insert(bills).values({ userId: user.id!, ...parseBillFormData(formData) });
  revalidatePath("/bills");
  revalidatePath("/");
}

export async function updateBill(billId: number, formData: FormData) {
  const user = await requireSession();
  const db = getDb();
  await db.update(bills)
    .set(parseBillFormData(formData))
    .where(and(eq(bills.id, billId), eq(bills.userId, user.id!)));
  revalidatePath("/bills");
  revalidatePath("/");
}

export async function deleteBill(billId: number) {
  const user = await requireSession();
  const db = getDb();
  await db.update(bills).set({ active: false })
    .where(and(eq(bills.id, billId), eq(bills.userId, user.id!)));
  revalidatePath("/bills");
  revalidatePath("/");
}
```

- [ ] **Step 2: Create shared BillForm component**

Create `components/bills/bill-form.tsx`:

```tsx
"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

type CreditCard = { id: number; name: string; dueDay: number };

interface BillFormProps {
  creditCards: CreditCard[];
  action: (formData: FormData) => Promise<void>;
  defaultValues?: {
    name?: string;
    amount?: number;
    description?: string;
    frequency?: "monthly" | "yearly";
    dueDay?: number;
    renewalMonth?: number | null;
    renewalDay?: number | null;
    type?: string;
    creditCardId?: number | null;
    reminderDaysBefore?: number;
  };
  submitLabel?: string;
}

export function BillForm({ creditCards, action, defaultValues = {}, submitLabel = "Save Bill" }: BillFormProps) {
  const [frequency, setFrequency] = useState<"monthly" | "yearly">(defaultValues.frequency ?? "monthly");
  const [type, setType] = useState(defaultValues.type ?? "subscription");

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-1">
        <Label className="text-muted-base text-[10px] uppercase tracking-widest">Name</Label>
        <Input name="name" required placeholder="Netflix" defaultValue={defaultValues.name}
          className="bg-bg-deep border-accent-purple/20 text-foreground" />
      </div>

      <div className="space-y-1">
        <Label className="text-muted-base text-[10px] uppercase tracking-widest">Amount (USD)</Label>
        <Input name="amount" type="number" step="0.01" min="0" required placeholder="30.00"
          defaultValue={defaultValues.amount}
          className="bg-bg-deep border-accent-purple/20 text-foreground" />
      </div>

      <div className="space-y-1">
        <Label className="text-muted-base text-[10px] uppercase tracking-widest">Description (optional)</Label>
        <Input name="description" placeholder="Notes about this bill" defaultValue={defaultValues.description ?? ""}
          className="bg-bg-deep border-accent-purple/20 text-foreground" />
      </div>

      <div className="space-y-1">
        <Label className="text-muted-base text-[10px] uppercase tracking-widest">Frequency</Label>
        <div className="flex gap-2">
          {(["monthly", "yearly"] as const).map((f) => (
            <button key={f} type="button"
              onClick={() => setFrequency(f)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-colors ${
                frequency === f
                  ? "bg-gradient-brand text-white"
                  : "bg-bg-deep border border-accent-purple/20 text-muted-base hover:text-foreground"
              }`}>
              {f}
            </button>
          ))}
        </div>
        <input type="hidden" name="frequency" value={frequency} />
      </div>

      {frequency === "monthly" && (
        <div className="space-y-1">
          <Label className="text-muted-base text-[10px] uppercase tracking-widest">Due Day of Month</Label>
          <Input name="dueDay" type="number" min="1" max="31" required placeholder="8"
            defaultValue={defaultValues.dueDay}
            className="bg-bg-deep border-accent-purple/20 text-foreground" />
        </div>
      )}

      {frequency === "yearly" && (
        <div className="flex gap-3">
          <div className="flex-1 space-y-1">
            <Label className="text-muted-base text-[10px] uppercase tracking-widest">Renewal Month</Label>
            <select name="renewalMonth" required
              defaultValue={defaultValues.renewalMonth ?? 1}
              className="w-full bg-bg-deep border border-accent-purple/20 text-foreground rounded-xl px-4 py-2.5">
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div className="w-28 space-y-1">
            <Label className="text-muted-base text-[10px] uppercase tracking-widest">Day</Label>
            <Input name="renewalDay" type="number" min="1" max="31" required placeholder="15"
              defaultValue={defaultValues.renewalDay ?? ""}
              className="bg-bg-deep border-accent-purple/20 text-foreground" />
          </div>
        </div>
      )}

      <div className="space-y-1">
        <Label className="text-muted-base text-[10px] uppercase tracking-widest">Type</Label>
        <select name="type" required value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full bg-bg-deep border border-accent-purple/20 text-foreground rounded-xl px-4 py-2.5">
          <option value="subscription">Subscription</option>
          <option value="utility">Utility</option>
          <option value="credit_card">Credit Card</option>
          <option value="loan">Loan</option>
          <option value="other">Other</option>
        </select>
      </div>

      {type === "subscription" && (
        <div className="space-y-1">
          <Label className="text-muted-base text-[10px] uppercase tracking-widest">Credit Card</Label>
          <select name="creditCardId"
            defaultValue={defaultValues.creditCardId ?? "none"}
            className="w-full bg-bg-deep border border-accent-purple/20 text-foreground rounded-xl px-4 py-2.5">
            <option value="none">None</option>
            {creditCards.map((c) => (
              <option key={c.id} value={c.id}>{c.name} (due day {c.dueDay})</option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-1">
        <Label className="text-muted-base text-[10px] uppercase tracking-widest">Remind me (days before)</Label>
        <Input name="reminderDaysBefore" type="number" min="1" max="14"
          defaultValue={defaultValues.reminderDaysBefore ?? 3}
          className="bg-bg-deep border-accent-purple/20 text-foreground" />
      </div>

      <Button type="submit" className="w-full bg-gradient-brand text-white font-bold py-3 rounded-xl">
        {submitLabel}
      </Button>
    </form>
  );
}
```

- [ ] **Step 3: Update new bill page to use BillForm**

Replace `app/(app)/bills/new/page.tsx`:

```tsx
import { createBill } from "@/lib/actions/bills";
import { getCreditCards } from "@/lib/actions/credit-cards";
import { BillForm } from "@/components/bills/bill-form";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function NewBillPage() {
  const cards = await getCreditCards();

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/bills" className="text-muted-base hover:text-foreground"><ChevronLeft size={20} /></Link>
        <h2 className="text-foreground text-xl font-bold">Add Bill</h2>
      </div>
      <BillForm creditCards={cards} action={createBill} submitLabel="Add Bill" />
    </div>
  );
}
```

- [ ] **Step 4: Create edit bill page**

Create `app/(app)/bills/[id]/edit/page.tsx`:

```tsx
import { getBillById, updateBill } from "@/lib/actions/bills";
import { getCreditCards } from "@/lib/actions/credit-cards";
import { BillForm } from "@/components/bills/bill-form";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function EditBillPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [bill, cards] = await Promise.all([getBillById(parseInt(id)), getCreditCards()]);
  if (!bill) notFound();

  async function handleUpdate(formData: FormData) {
    "use server";
    await updateBill(bill!.id, formData);
    const { redirect } = await import("next/navigation");
    redirect("/bills");
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/bills" className="text-muted-base hover:text-foreground"><ChevronLeft size={20} /></Link>
        <h2 className="text-foreground text-xl font-bold">Edit Bill</h2>
      </div>
      <BillForm
        creditCards={cards}
        action={handleUpdate}
        submitLabel="Save Changes"
        defaultValues={{
          name: bill.name,
          amount: bill.amount,
          description: bill.description ?? "",
          frequency: bill.frequency as "monthly" | "yearly",
          dueDay: bill.dueDay,
          renewalMonth: bill.renewalMonth,
          renewalDay: bill.renewalDay,
          type: bill.type,
          creditCardId: bill.creditCardId,
          reminderDaysBefore: bill.reminderDaysBefore,
        }}
      />
    </div>
  );
}
```

- [ ] **Step 5: Update bills list page**

Replace `app/(app)/bills/page.tsx`:

```tsx
import { getUserBills, deleteBill } from "@/lib/actions/bills";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Trash2, Plus, Pencil } from "lucide-react";

const TYPE_ICON: Record<string, string> = {
  utility: "💡", subscription: "📺", credit_card: "💳", loan: "🏦", other: "📋",
};

const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default async function BillsPage() {
  const billsList = await getUserBills();

  async function handleDelete(id: number) {
    "use server";
    await deleteBill(id);
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-foreground text-xl font-bold">Bills & Subscriptions</h2>
          <p className="text-muted-base text-sm">Recurring payments and reminders</p>
        </div>
        <Link href="/bills/new">
          <Button className="bg-gradient-brand text-white font-bold gap-2">
            <Plus size={16} /> Add Bill
          </Button>
        </Link>
      </div>

      <div className="rounded-2xl bg-white/[0.03] border border-accent-purple/10 divide-y divide-white/5">
        {billsList.length === 0 && (
          <p className="text-muted-base text-sm text-center py-8">No bills yet. Add your first one.</p>
        )}
        {billsList.map((b) => {
          const dueLine = b.frequency === "yearly"
            ? `Renews ${MONTHS_SHORT[(b.renewalMonth ?? 1) - 1]} ${b.renewalDay} · Yearly`
            : `Due day ${b.dueDay} · Monthly`;
          return (
            <div key={b.id} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xl shrink-0">{TYPE_ICON[b.type] ?? "📋"}</span>
                <div className="min-w-0">
                  <p className="text-foreground font-medium truncate">{b.name}</p>
                  <p className="text-muted-base text-xs">
                    {dueLine}
                    {b.creditCardName && (
                      <span className="ml-2 bg-accent-purple/15 text-accent-purple-light rounded px-1.5 py-0.5 text-[10px]">
                        💳 {b.creditCardName}
                      </span>
                    )}
                  </p>
                  {b.description && (
                    <p className="text-muted-base text-[10px] truncate mt-0.5">{b.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-amber-400 font-bold">{formatCurrency(b.amount)}</span>
                <Link href={`/bills/${b.id}/edit`} className="text-muted-base hover:text-foreground transition-colors">
                  <Pencil size={14} />
                </Link>
                <form action={handleDelete.bind(null, b.id)}>
                  <button type="submit" className="text-muted-base hover:text-red-400 transition-colors">
                    <Trash2 size={15} />
                  </button>
                </form>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Update upcoming bills strip for yearly support**

Replace `components/dashboard/upcoming-bills-strip.tsx`:

```tsx
import { formatCurrency } from "@/lib/utils";

const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

type Bill = {
  id: number; name: string; amount: number; dueDay: number; type: string;
  frequency?: string; renewalMonth?: number | null; renewalDay?: number | null;
};

const TYPE_ICON: Record<string, string> = {
  utility: "💡", subscription: "📺", credit_card: "💳", loan: "🏦", other: "📋",
};

export function UpcomingBillsStrip({ bills }: { bills: Bill[] }) {
  if (bills.length === 0) return null;
  const today = new Date().getDate();

  return (
    <div className="rounded-2xl bg-white/[0.03] border border-accent-purple/10 p-5">
      <h3 className="text-accent-purple-light text-[10px] uppercase tracking-widest font-semibold mb-3">
        Due Soon
      </h3>
      <div className="space-y-2">
        {bills.map((b) => {
          const isYearly = b.frequency === "yearly";
          const dueDay = isYearly ? (b.renewalDay ?? 1) : b.dueDay;
          const daysUntil = dueDay >= today ? dueDay - today : 31 - today + dueDay;
          const dueDateLabel = isYearly
            ? `${MONTHS_SHORT[(b.renewalMonth ?? 1) - 1]} ${b.renewalDay}`
            : `day ${b.dueDay}`;
          return (
            <div key={b.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
              <div className="flex items-center gap-3">
                <span className="text-lg">{TYPE_ICON[b.type] ?? "📋"}</span>
                <div>
                  <p className="text-foreground text-sm font-medium">{b.name}</p>
                  <p className="text-muted-base text-[10px]">
                    Due {daysUntil === 0 ? "today" : `in ${daysUntil} day${daysUntil === 1 ? "" : "s"}`} ({dueDateLabel})
                  </p>
                </div>
              </div>
              <span className="text-amber-400 font-semibold text-sm">{formatCurrency(b.amount)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Verify bills flow end-to-end**

Start dev server. Test:
1. `/bills` — existing bills show with edit + delete icons
2. `/bills/new` — form shows frequency toggle, yearly reveals month+day pickers, subscription type shows card picker
3. Add a yearly subscription → appears in list with "Renews {Month} {day} · Yearly"
4. Edit the bill → form pre-fills correctly, save redirects to `/bills`
5. `/settings` — add a credit card, create a subscription bill linked to it → badge appears

- [ ] **Step 8: Commit**

```bash
git add components/bills/bill-form.tsx lib/actions/bills.ts \
  app/(app)/bills/page.tsx app/(app)/bills/new/page.tsx \
  app/(app)/bills/[id]/edit/page.tsx \
  components/dashboard/upcoming-bills-strip.tsx
git commit -m "feat: bills edit, yearly renewals, credit card linking, description"
```

---

## Task 4: Income Server Actions

**Files:**
- Create: `lib/actions/income.ts`
- Modify: `lib/actions/months.ts`

- [ ] **Step 1: Create income actions**

Create `lib/actions/income.ts`:

```ts
"use server";
import { getDb, incomeEntries, incomeSources, months } from "@/lib/db";
import { and, eq, asc } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";

export async function getIncomeEntries(monthId: number) {
  const user = await requireSession();
  const db = getDb();
  return db.select().from(incomeEntries)
    .where(and(eq(incomeEntries.monthId, monthId), eq(incomeEntries.userId, user.id!)))
    .orderBy(asc(incomeEntries.expectedDate));
}

export function calcIncomeTotals(entries: { status: string; amount: number }[]) {
  const arrived = entries.filter((e) => e.status === "arrived").reduce((s, e) => s + e.amount, 0);
  const expected = entries.filter((e) => e.status === "expected").reduce((s, e) => s + e.amount, 0);
  const possible = entries.filter((e) => e.status === "might_arrive").reduce((s, e) => s + e.amount, 0);
  return { budgetTotal: arrived + expected, actualBalance: arrived, possible };
}

export async function generateMonthIncomeEntries(monthId: number, year: number, month: number) {
  const user = await requireSession();
  const db = getDb();

  const sources = await db.select().from(incomeSources)
    .where(and(eq(incomeSources.userId, user.id!), eq(incomeSources.active, true)));

  for (const source of sources) {
    if (source.frequency === "one_time") continue;

    // Check if entries already exist for this source+month
    const existing = await db.select().from(incomeEntries)
      .where(and(
        eq(incomeEntries.userId, user.id!),
        eq(incomeEntries.monthId, monthId),
        eq(incomeEntries.sourceId, source.id),
      ))
      .limit(1);

    if (existing.length > 0) continue;

    if (source.frequency === "monthly") {
      await db.insert(incomeEntries).values({
        userId: user.id!,
        sourceId: source.id,
        monthId,
        name: source.name,
        amount: source.amount,
        status: "expected",
        expectedDate: `${year}-${String(month).padStart(2, "0")}-01`,
      });
    } else if (source.frequency === "biweekly") {
      // Two entries: 1st and 15th of the month
      for (const day of [1, 15]) {
        await db.insert(incomeEntries).values({
          userId: user.id!,
          sourceId: source.id,
          monthId,
          name: source.name,
          amount: source.amount,
          status: "expected",
          expectedDate: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
        });
      }
    }
  }
}

export async function createIncomeEntry(formData: FormData) {
  const user = await requireSession();
  const db = getDb();
  const monthId = parseInt(formData.get("monthId") as string);
  const name = (formData.get("name") as string).trim();
  const amount = parseFloat(formData.get("amount") as string);
  const status = (formData.get("status") as string) as "expected" | "might_arrive";
  const expectedDate = formData.get("expectedDate") as string;
  const frequency = formData.get("frequency") as "biweekly" | "monthly" | "one_time";

  if (frequency !== "one_time") {
    // Save as a recurring source and generate entries for this month
    const [source] = await db.insert(incomeSources).values({
      userId: user.id!,
      name,
      amount,
      frequency,
    }).returning();

    const [monthRow] = await db.select().from(months).where(eq(months.id, monthId)).limit(1);
    if (!monthRow) throw new Error("Month not found");

    // Generate entries for this month only (future months auto-generate on open)
    if (frequency === "monthly") {
      await db.insert(incomeEntries).values({
        userId: user.id!,
        sourceId: source.id,
        monthId,
        name,
        amount,
        status,
        expectedDate: `${monthRow.year}-${String(monthRow.month).padStart(2, "0")}-01`,
      });
    } else {
      for (const day of [1, 15]) {
        await db.insert(incomeEntries).values({
          userId: user.id!,
          sourceId: source.id,
          monthId,
          name,
          amount,
          status,
          expectedDate: `${monthRow.year}-${String(monthRow.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
        });
      }
    }
  } else {
    await db.insert(incomeEntries).values({
      userId: user.id!,
      sourceId: null,
      monthId,
      name,
      amount,
      status,
      expectedDate,
    });
  }

  revalidatePath("/income");
  revalidatePath("/");
}

export async function updateIncomeEntryStatus(
  entryId: number,
  status: "expected" | "might_arrive" | "arrived"
) {
  const user = await requireSession();
  const db = getDb();
  const arrivedDate = status === "arrived" ? new Date().toISOString().split("T")[0] : null;
  await db.update(incomeEntries)
    .set({ status, arrivedDate })
    .where(and(eq(incomeEntries.id, entryId), eq(incomeEntries.userId, user.id!)));
  revalidatePath("/income");
  revalidatePath("/");
}

export async function deleteIncomeEntry(entryId: number) {
  const user = await requireSession();
  const db = getDb();
  await db.delete(incomeEntries)
    .where(and(eq(incomeEntries.id, entryId), eq(incomeEntries.userId, user.id!)));
  revalidatePath("/income");
  revalidatePath("/");
}
```

- [ ] **Step 2: Update getOrCreateMonth to generate income entries**

In `lib/actions/months.ts`, add the call to `generateMonthIncomeEntries` after a new month is created. Replace the full file:

```ts
"use server";
import { getDb, months, userSettings } from "@/lib/db";
import { and, eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";
import { generateMonthIncomeEntries } from "@/lib/actions/income";

export async function getOrCreateMonth(year: number, month: number) {
  const user = await requireSession();
  const userId = user.id!;
  const db = getDb();
  const existing = await db.select().from(months)
    .where(and(eq(months.userId, userId), eq(months.year, year), eq(months.month, month)))
    .limit(1);

  if (existing[0]) {
    await generateMonthIncomeEntries(existing[0].id, year, month);
    return existing[0];
  }

  const settings = await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
  const defaults = settings[0] ?? { defaultSavingsPct: 20, defaultWantsPct: 10, defaultBillsPct: 70 };

  const [created] = await db.insert(months).values({
    userId,
    year,
    month,
    savingsPct: defaults.defaultSavingsPct,
    wantsPct:   defaults.defaultWantsPct,
    billsPct:   defaults.defaultBillsPct,
  }).returning();

  await generateMonthIncomeEntries(created.id, year, month);
  return created;
}

export async function updateMonthIncome(monthId: number, income: number, openingBalance: number) {
  const user = await requireSession();
  const userId = user.id!;
  const db = getDb();
  await db.update(months)
    .set({ income, openingBalance })
    .where(and(eq(months.id, monthId), eq(months.userId, userId)));
}

export async function updateMonthAllocation(monthId: number, savingsPct: number, wantsPct: number, billsPct: number) {
  const user = await requireSession();
  const userId = user.id!;
  const db = getDb();
  await db.update(months)
    .set({ savingsPct, wantsPct, billsPct })
    .where(and(eq(months.id, monthId), eq(months.userId, userId)));
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/actions/income.ts lib/actions/months.ts
git commit -m "feat: income server actions with recurring entry generation"
```

---

## Task 5: Income Page + Components

**Files:**
- Create: `components/income/overdue-banner.tsx`
- Create: `components/income/income-entry-list.tsx`
- Create: `components/income/income-form.tsx`
- Create: `app/(app)/income/page.tsx`

- [ ] **Step 1: Create OverdueBanner component**

Create `components/income/overdue-banner.tsx`:

```tsx
"use client";
import { updateIncomeEntryStatus } from "@/lib/actions/income";
import { formatCurrency } from "@/lib/utils";

type Entry = { id: number; name: string; amount: number; expectedDate: string };

export function OverdueBanner({ entry }: { entry: Entry }) {
  const date = new Date(entry.expectedDate + "T00:00:00").toLocaleDateString("en-US", {
    month: "short", day: "numeric",
  });

  return (
    <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 flex items-start justify-between gap-3">
      <p className="text-amber-400 text-sm">
        ⚠️ <strong>{formatCurrency(entry.amount)}</strong> from <strong>{entry.name}</strong> was expected {date}. Did it arrive?
      </p>
      <div className="flex gap-2 shrink-0">
        <form action={async () => {
          "use server";
          await updateIncomeEntryStatus(entry.id, "arrived");
        }}>
          <button type="submit" className="text-xs text-green-400 hover:text-green-300 underline whitespace-nowrap">
            Yes
          </button>
        </form>
        <form action={async () => {
          "use server";
          await updateIncomeEntryStatus(entry.id, "might_arrive");
        }}>
          <button type="submit" className="text-xs text-muted-base hover:text-foreground underline whitespace-nowrap">
            No, remove
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create IncomeEntryList component**

Create `components/income/income-entry-list.tsx`:

```tsx
import { updateIncomeEntryStatus } from "@/lib/actions/income";
import { formatCurrency } from "@/lib/utils";

type Entry = {
  id: number; name: string; amount: number; status: string;
  expectedDate: string; arrivedDate: string | null; sourceId: number | null;
};

const STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  arrived:     { label: "Arrived",     cls: "bg-green-500/15 text-green-400" },
  expected:    { label: "Expected",    cls: "bg-amber-500/15 text-amber-400" },
  might_arrive:{ label: "Might Arrive",cls: "bg-white/[0.06] text-muted-base" },
};

export function IncomeEntryList({ entries }: { entries: Entry[] }) {
  if (entries.length === 0) {
    return <p className="text-muted-base text-sm text-center py-6">No income entries this month.</p>;
  }

  return (
    <div className="rounded-2xl bg-white/[0.03] border border-accent-purple/10 divide-y divide-white/5">
      {entries.map((e) => {
        const s = STATUS_STYLE[e.status] ?? STATUS_STYLE.might_arrive;
        const dateLabel = new Date(e.expectedDate + "T00:00:00").toLocaleDateString("en-US", {
          month: "short", day: "numeric",
        });
        return (
          <div key={e.id} className="flex items-center justify-between p-4 gap-3">
            <div className="min-w-0">
              <p className="text-foreground font-medium truncate">{e.name}</p>
              <p className="text-muted-base text-xs">Expected {dateLabel}</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-amber-400 font-bold">{formatCurrency(e.amount)}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${s.cls}`}>
                {s.label}
              </span>
              {e.status !== "arrived" && (
                <form action={async () => {
                  "use server";
                  await updateIncomeEntryStatus(e.id, "arrived");
                }}>
                  <button type="submit" className="text-[10px] text-green-400 hover:text-green-300 underline">
                    Mark arrived
                  </button>
                </form>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Create IncomeForm component**

Create `components/income/income-form.tsx`:

```tsx
"use client";
import { useState } from "react";
import { createIncomeEntry } from "@/lib/actions/income";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function IncomeForm({ monthId }: { monthId: number }) {
  const [frequency, setFrequency] = useState<"biweekly" | "monthly" | "one_time">("monthly");
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} className="w-full bg-gradient-brand text-white font-bold">
        + Add Income
      </Button>
    );
  }

  async function handleSubmit(formData: FormData) {
    await createIncomeEntry(formData);
    setOpen(false);
  }

  return (
    <form action={handleSubmit} className="rounded-2xl bg-white/[0.03] border border-accent-purple/10 p-4 space-y-4">
      <p className="text-muted-base text-xs uppercase tracking-widest">Add Income</p>
      <input type="hidden" name="monthId" value={monthId} />

      <div className="space-y-1">
        <Label className="text-muted-base text-[10px] uppercase tracking-widest">Source Name</Label>
        <Input name="name" required placeholder="Employer X"
          className="bg-bg-deep border-accent-purple/20 text-foreground" />
      </div>

      <div className="space-y-1">
        <Label className="text-muted-base text-[10px] uppercase tracking-widest">Amount (USD)</Label>
        <Input name="amount" type="number" step="0.01" min="0" required placeholder="2000"
          className="bg-bg-deep border-accent-purple/20 text-foreground" />
      </div>

      <div className="space-y-1">
        <Label className="text-muted-base text-[10px] uppercase tracking-widest">Frequency</Label>
        <div className="flex gap-2 flex-wrap">
          {([
            ["biweekly", "Every 2 Weeks"],
            ["monthly", "Monthly"],
            ["one_time", "One-Time"],
          ] as const).map(([val, label]) => (
            <button key={val} type="button"
              onClick={() => setFrequency(val)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                frequency === val
                  ? "bg-gradient-brand text-white"
                  : "bg-bg-deep border border-accent-purple/20 text-muted-base hover:text-foreground"
              }`}>
              {label}
            </button>
          ))}
        </div>
        <input type="hidden" name="frequency" value={frequency} />
      </div>

      <div className="space-y-1">
        <Label className="text-muted-base text-[10px] uppercase tracking-widest">Status</Label>
        <select name="status"
          className="w-full bg-bg-deep border border-accent-purple/20 text-foreground rounded-xl px-4 py-2.5">
          <option value="expected">Expected</option>
          <option value="might_arrive">Might Arrive</option>
        </select>
      </div>

      {frequency === "one_time" && (
        <div className="space-y-1">
          <Label className="text-muted-base text-[10px] uppercase tracking-widest">Expected Date</Label>
          <Input name="expectedDate" type="date" required
            className="bg-bg-deep border-accent-purple/20 text-foreground" />
        </div>
      )}

      <div className="flex gap-2">
        <Button type="submit" className="flex-1 bg-gradient-brand text-white font-bold">Save</Button>
        <Button type="button" variant="outline" onClick={() => setOpen(false)}
          className="border-accent-purple/20 text-muted-base">Cancel</Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 4: Create Income page**

Create `app/(app)/income/page.tsx`:

```tsx
import { getOrCreateMonth } from "@/lib/actions/months";
import { getIncomeEntries, calcIncomeTotals } from "@/lib/actions/income";
import { currentYearMonth } from "@/lib/utils";
import { MonthSwitcher } from "@/components/layout/month-switcher";
import { OverdueBanner } from "@/components/income/overdue-banner";
import { IncomeEntryList } from "@/components/income/income-entry-list";
import { IncomeForm } from "@/components/income/income-form";
import { formatCurrency } from "@/lib/utils";

export default async function IncomePage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const params = await searchParams;
  const def = currentYearMonth();
  const year  = parseInt(params.year  ?? String(def.year));
  const month = parseInt(params.month ?? String(def.month));

  const monthData = await getOrCreateMonth(year, month);
  const entries = await getIncomeEntries(monthData.id);
  const totals = calcIncomeTotals(entries);

  const today = new Date().toISOString().split("T")[0];
  const overdueEntries = entries.filter(
    (e) => e.status === "expected" && e.expectedDate < today
  );

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-foreground text-xl font-bold">Income</h2>
          <p className="text-muted-base text-sm">Track your earnings this month</p>
        </div>
        <MonthSwitcher year={year} month={month} />
      </div>

      {overdueEntries.map((e) => (
        <OverdueBanner key={e.id} entry={e} />
      ))}

      <IncomeEntryList entries={entries} />

      {/* Summary totals */}
      <div className="rounded-2xl bg-white/[0.03] border border-accent-purple/10 p-4 space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-muted-base text-sm">Budget total <span className="text-[10px]">(arrived + expected)</span></span>
          <span className="text-foreground font-bold text-lg">{formatCurrency(totals.budgetTotal)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-base text-sm">Actual balance <span className="text-[10px]">(arrived only)</span></span>
          <span className="text-accent-purple-light font-semibold">{formatCurrency(totals.actualBalance)}</span>
        </div>
        {totals.possible > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-muted-base text-xs">+ Possible</span>
            <span className="text-muted-base text-xs">+{formatCurrency(totals.possible)}</span>
          </div>
        )}
      </div>

      <IncomeForm monthId={monthData.id} />
    </div>
  );
}
```

- [ ] **Step 5: Verify income page**

Start dev server. Navigate to `/income`:
- Should show "No income entries this month." initially
- Click "+ Add Income", add a biweekly source "Employer X" $2,000 — two entries appear (1st and 15th)
- Mark one as arrived — badge turns green
- Set expected date in the past for a one-time entry → overdue banner appears with Yes/No actions

- [ ] **Step 6: Commit**

```bash
git add components/income/ app/(app)/income/page.tsx
git commit -m "feat: income tracking page with overdue prompts and status management"
```

---

## Task 6: Goals & Savings Allocation

**Files:**
- Create: `lib/actions/goals.ts`
- Create: `components/goals/savings-allocation-list.tsx`
- Create: `app/(app)/goals/page.tsx`
- Modify: `components/dashboard/allocation-card.tsx`

- [ ] **Step 1: Create goals server actions**

Create `lib/actions/goals.ts`:

```ts
"use server";
import { getDb, savingsAllocations } from "@/lib/db";
import { and, eq, asc, sum } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";

export async function getSavingsAllocations() {
  const user = await requireSession();
  const db = getDb();
  return db.select().from(savingsAllocations)
    .where(eq(savingsAllocations.userId, user.id!))
    .orderBy(asc(savingsAllocations.sortOrder), asc(savingsAllocations.id));
}

async function validateAllocationSum(userId: string, excludeId?: number, newPct?: number) {
  const db = getDb();
  const all = await db.select().from(savingsAllocations)
    .where(eq(savingsAllocations.userId, userId));
  const total = all
    .filter((a) => a.id !== excludeId)
    .reduce((s, a) => s + a.percentage, 0) + (newPct ?? 0);
  if (total > 100) throw new Error(`Allocations exceed 100% (currently ${total}%)`);
}

export async function createSavingsAllocation(formData: FormData) {
  const user = await requireSession();
  const db = getDb();
  const name = (formData.get("name") as string).trim();
  const percentage = parseInt(formData.get("percentage") as string);
  if (!name || isNaN(percentage) || percentage < 1 || percentage > 100) throw new Error("Invalid data");
  await validateAllocationSum(user.id!, undefined, percentage);
  await db.insert(savingsAllocations).values({ userId: user.id!, name, percentage, sortOrder: 0 });
  revalidatePath("/goals");
}

export async function updateSavingsAllocation(id: number, formData: FormData) {
  const user = await requireSession();
  const db = getDb();
  const percentage = parseInt(formData.get("percentage") as string);
  const name = (formData.get("name") as string).trim();
  if (isNaN(percentage) || percentage < 1 || percentage > 100) throw new Error("Invalid percentage");
  await validateAllocationSum(user.id!, id, percentage);
  await db.update(savingsAllocations)
    .set({ percentage, name })
    .where(and(eq(savingsAllocations.id, id), eq(savingsAllocations.userId, user.id!)));
  revalidatePath("/goals");
}

export async function deleteSavingsAllocation(id: number) {
  const user = await requireSession();
  const db = getDb();
  await db.delete(savingsAllocations)
    .where(and(eq(savingsAllocations.id, id), eq(savingsAllocations.userId, user.id!)));
  revalidatePath("/goals");
}
```

- [ ] **Step 2: Create SavingsAllocationList component**

Create `components/goals/savings-allocation-list.tsx`:

```tsx
import { deleteSavingsAllocation, updateSavingsAllocation } from "@/lib/actions/goals";
import { createSavingsAllocation } from "@/lib/actions/goals";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2 } from "lucide-react";

type Allocation = { id: number; name: string; percentage: number };

export function SavingsAllocationList({
  allocations,
  savingsPot,
}: {
  allocations: Allocation[];
  savingsPot: number;
}) {
  const totalPct = allocations.reduce((s, a) => s + a.percentage, 0);
  const remaining = 100 - totalPct;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-foreground font-semibold">Savings Allocation</h3>
        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
          totalPct === 100 ? "bg-green-500/15 text-green-400" :
          totalPct < 100  ? "bg-amber-500/15 text-amber-400" :
                            "bg-red-500/15 text-red-400"
        }`}>
          {totalPct}% allocated{totalPct < 100 ? ` · ${remaining}% unassigned` : ""}
        </span>
      </div>

      <div className="rounded-2xl bg-white/[0.03] border border-accent-purple/10 divide-y divide-white/5">
        {allocations.length === 0 && (
          <p className="text-muted-base text-sm text-center py-6">No allocations yet. Add a destination.</p>
        )}
        {allocations.map((a) => {
          const dollars = savingsPot * (a.percentage / 100);
          return (
            <div key={a.id} className="flex items-center justify-between p-4 gap-3">
              <div className="min-w-0">
                <p className="text-foreground font-medium truncate">{a.name}</p>
                <p className="text-muted-base text-xs">{formatCurrency(dollars)} this month</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-accent-purple-light font-bold">{a.percentage}%</span>
                <form action={deleteSavingsAllocation.bind(null, a.id)}>
                  <button type="submit" className="text-muted-base hover:text-red-400 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </form>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add destination form */}
      <form action={createSavingsAllocation}
        className="rounded-2xl bg-white/[0.03] border border-accent-purple/10 p-4 space-y-3">
        <p className="text-muted-base text-xs uppercase tracking-widest">Add Destination</p>
        <div className="flex gap-3">
          <div className="flex-1 space-y-1">
            <Label className="text-muted-base text-[10px] uppercase tracking-widest">Name</Label>
            <Input name="name" required placeholder="Roth IRA"
              className="bg-bg-deep border-accent-purple/20 text-foreground" />
          </div>
          <div className="w-24 space-y-1">
            <Label className="text-muted-base text-[10px] uppercase tracking-widest">%</Label>
            <Input name="percentage" type="number" min="1" max="100" required placeholder="50"
              className="bg-bg-deep border-accent-purple/20 text-foreground" />
          </div>
        </div>
        <Button type="submit" className="w-full bg-gradient-brand text-white font-bold">
          Add Destination
        </Button>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Create Goals page**

Create `app/(app)/goals/page.tsx`:

```tsx
import { getOrCreateMonth } from "@/lib/actions/months";
import { getIncomeEntries, calcIncomeTotals } from "@/lib/actions/income";
import { getSavingsAllocations } from "@/lib/actions/goals";
import { currentYearMonth } from "@/lib/utils";
import { MonthSwitcher } from "@/components/layout/month-switcher";
import { SavingsAllocationList } from "@/components/goals/savings-allocation-list";
import { formatCurrency } from "@/lib/utils";

export default async function GoalsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const params = await searchParams;
  const def = currentYearMonth();
  const year  = parseInt(params.year  ?? String(def.year));
  const month = parseInt(params.month ?? String(def.month));

  const [monthData, allocations] = await Promise.all([
    getOrCreateMonth(year, month),
    getSavingsAllocations(),
  ]);

  const entries = await getIncomeEntries(monthData.id);
  const { budgetTotal } = calcIncomeTotals(entries);
  // Fall back to monthData.income if no income entries yet
  const incomeBasis = budgetTotal > 0 ? budgetTotal : (monthData.income ?? 0);

  const savingsPot = incomeBasis * ((monthData.savingsPct ?? 20) / 100);
  const billsPot   = incomeBasis * ((monthData.billsPct  ?? 70) / 100);
  const personalPot = incomeBasis * ((monthData.wantsPct  ?? 10) / 100);

  const POTS = [
    { label: "Savings",  amount: savingsPot,  pct: monthData.savingsPct ?? 20, color: "text-amber-400",  bg: "bg-amber-500/10",  border: "border-amber-500/25" },
    { label: "Bills",    amount: billsPot,    pct: monthData.billsPct  ?? 70, color: "text-pink-400",   bg: "bg-pink-500/10",   border: "border-pink-500/25" },
    { label: "Personal", amount: personalPot, pct: monthData.wantsPct  ?? 10, color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/25" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-foreground text-xl font-bold">Goals & Allocation</h2>
          <p className="text-muted-base text-sm">Where your money goes</p>
        </div>
        <MonthSwitcher year={year} month={month} />
      </div>

      {/* Three pots */}
      <div className="grid grid-cols-3 gap-3">
        {POTS.map((p) => (
          <div key={p.label} className={`rounded-2xl ${p.bg} border ${p.border} p-4 text-center`}>
            <p className={`text-[10px] uppercase tracking-wider ${p.color} mb-1`}>{p.label}</p>
            <p className={`text-xl font-bold ${p.color}`}>{formatCurrency(p.amount)}</p>
            <p className="text-muted-base text-[10px] mt-0.5">{p.pct}% of income</p>
          </div>
        ))}
      </div>

      <SavingsAllocationList allocations={allocations} savingsPot={savingsPot} />
    </div>
  );
}
```

- [ ] **Step 4: Rename "wants" → "Personal" in AllocationCard**

In `components/dashboard/allocation-card.tsx`, update the `STYLES` record and the label display:

```tsx
import { formatCurrency } from "@/lib/utils";

type Bucket = "savings" | "bills" | "wants";

const STYLES: Record<Bucket, { bg: string; border: string; label: string; bar: string; icon: string; displayName: string }> = {
  savings: { bg: "bg-amber-500/10",  border: "border-amber-500/25",  label: "text-amber-400",  bar: "bg-amber-400",  icon: "💰", displayName: "Savings" },
  bills:   { bg: "bg-pink-500/10",   border: "border-pink-500/25",   label: "text-pink-400",   bar: "bg-pink-400",   icon: "🏦", displayName: "Bills" },
  wants:   { bg: "bg-violet-500/10", border: "border-violet-500/25", label: "text-violet-400", bar: "bg-violet-400", icon: "✨", displayName: "Personal" },
};

interface AllocationCardProps {
  bucket: Bucket;
  pct: number;
  income: number;
  spent: number;
}

export function AllocationCard({ bucket, pct, income, spent }: AllocationCardProps) {
  const allocated = income * (pct / 100);
  const remaining = allocated - spent;
  const fill = allocated > 0 ? Math.min((spent / allocated) * 100, 100) : 0;
  const s = STYLES[bucket];

  return (
    <div className={`rounded-2xl ${s.bg} border ${s.border} p-4`}>
      <div className="flex justify-between items-center mb-2">
        <span className="text-xl">{s.icon}</span>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${s.label} ${s.bg} border ${s.border}`}>
          {pct}% target
        </span>
      </div>
      <p className={`text-[10px] uppercase tracking-wider ${s.label} mb-1`}>{s.displayName}</p>
      <p className="text-foreground text-xl font-bold">{formatCurrency(allocated)}</p>
      <p className="text-muted-base text-[10px] mt-0.5">
        {formatCurrency(spent)} spent · {formatCurrency(Math.max(remaining, 0))} left
      </p>
      <div className="h-1 rounded-full bg-white/[0.08] mt-3 overflow-hidden">
        <div className={`h-full rounded-full ${s.bar}`} style={{ width: `${fill}%` }} />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verify goals page**

Navigate to `/goals`. Should show three pots (Savings / Bills / Personal) with amounts based on income. Add a savings allocation — shows name, %, dollar amount. Validation: try adding >100% total — should error (shown as thrown error for now; no fancy toast needed). Delete an allocation — it disappears.

- [ ] **Step 6: Commit**

```bash
git add lib/actions/goals.ts components/goals/ app/(app)/goals/page.tsx \
  components/dashboard/allocation-card.tsx
git commit -m "feat: goals page with savings allocation destinations"
```

---

## Task 7: Navigation + Hero Card Updates

**Files:**
- Modify: `components/layout/sidebar.tsx`
- Modify: `components/layout/bottom-nav.tsx`
- Modify: `components/dashboard/hero-card.tsx`
- Modify: `app/(app)/page.tsx`

- [ ] **Step 1: Add Income to sidebar nav**

Replace `components/layout/sidebar.tsx`:

```tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BarChart2, Receipt, Plane, Tag, Target, Settings, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/",        label: "Overview", icon: Home },
  { href: "/income",  label: "Income",   icon: Wallet },
  { href: "/trends",  label: "Trends",   icon: BarChart2 },
  { href: "/bills",   label: "Bills",    icon: Receipt },
  { href: "/trips",   label: "Trips",    icon: Plane },
  { href: "/tags",    label: "Tags",     icon: Tag },
  { href: "/goals",   label: "Goals",    icon: Target },
];

export function Sidebar() {
  const path = usePathname();
  return (
    <nav className="hidden md:flex flex-col w-48 bg-bg-deep/70 border-r border-accent-purple/10 p-4 gap-1">
      <span className="gradient-text font-black text-lg tracking-widest px-2 pb-4 mb-2 border-b border-accent-purple/10">
        EASYBUDGET
      </span>
      {NAV.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors",
            path === href
              ? "bg-gradient-card border border-accent-gold/25 text-accent-gold"
              : "text-muted-base hover:text-foreground hover:bg-white/5"
          )}>
          <Icon size={16} />
          {label}
        </Link>
      ))}
      <div className="flex-1" />
      <Link href="/settings"
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-base hover:text-foreground hover:bg-white/5">
        <Settings size={16} /> Settings
      </Link>
    </nav>
  );
}
```

- [ ] **Step 2: Add Income to bottom nav**

Replace `components/layout/bottom-nav.tsx`:

```tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Wallet, Target, Receipt, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/",       label: "Home",   icon: Home },
  { href: "/income", label: "Income", icon: Wallet },
  { href: "/goals",  label: "Goals",  icon: Target },
  { href: "/bills",  label: "Bills",  icon: Receipt },
  { href: "/trips",  label: "More",   icon: MoreHorizontal },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-bg-deep/90 backdrop-blur border-t border-accent-purple/10 flex justify-around py-2 z-50">
      {NAV.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href}
          className={cn(
            "flex flex-col items-center gap-1 px-3 py-1",
            path === href ? "text-accent-gold" : "text-muted-base"
          )}>
          <Icon size={20} />
          <span className="text-[9px] uppercase tracking-wide">{label}</span>
        </Link>
      ))}
    </nav>
  );
}
```

- [ ] **Step 3: Update HeroCard to show budget total + actual balance**

Replace `components/dashboard/hero-card.tsx`:

```tsx
import { formatCurrency } from "@/lib/utils";

interface HeroCardProps {
  budgetTotal: number;
  actualBalance: number;
  possible: number;
  openingBalance: number;
  totalExpenses: number;
}

export function HeroCard({ budgetTotal, actualBalance, possible, openingBalance, totalExpenses }: HeroCardProps) {
  const closingBalance = openingBalance + actualBalance - totalExpenses;
  const pctUsed = budgetTotal > 0 ? Math.min((totalExpenses / budgetTotal) * 100, 100) : 0;
  const onTrack = pctUsed < 85;

  return (
    <div className="rounded-2xl bg-gradient-card border border-accent-gold/25 p-5">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-accent-purple-light text-[10px] uppercase tracking-widest mb-1">Budget Total</p>
          <p className="gradient-text text-4xl font-black">{formatCurrency(budgetTotal)}</p>
          <p className="text-muted-base text-xs mt-1">
            Actual: {formatCurrency(actualBalance)}
            {possible > 0 && <span className="ml-2 text-muted-base/60">+{formatCurrency(possible)} possible</span>}
          </p>
          <p className="text-muted-base text-xs">
            Opening: {formatCurrency(openingBalance)} · Closing: {formatCurrency(closingBalance)}
          </p>
        </div>
        <div className="text-right">
          <span className={`text-[10px] px-3 py-1 rounded-full font-semibold ${
            onTrack
              ? "bg-green-500/15 text-green-400 border border-green-500/30"
              : "bg-red-500/15 text-red-400 border border-red-500/30"
          }`}>
            {onTrack ? "✓ On track" : "⚠ Over budget"}
          </span>
          <p className="text-foreground text-xl font-bold mt-2">{formatCurrency(closingBalance)}</p>
          <p className="text-muted-base text-[10px]">Cash left</p>
        </div>
      </div>
      <div className="mt-4">
        <div className="flex justify-between text-[10px] text-muted-base mb-1">
          <span>Spent: {formatCurrency(totalExpenses)}</span>
          <span>{pctUsed.toFixed(0)}% of budget</span>
        </div>
        <div className="h-2 rounded-full bg-white/[0.08] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-brand transition-all"
            style={{ width: `${pctUsed}%` }}
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Update home page to pass income totals to HeroCard**

Replace `app/(app)/page.tsx`:

```tsx
import { getOrCreateMonth } from "@/lib/actions/months";
import { seedDefaultTags } from "@/lib/actions/tags";
import { getExpensesForMonth } from "@/lib/actions/expenses";
import { getUpcomingBills } from "@/lib/actions/bills";
import { getIncomeEntries, calcIncomeTotals } from "@/lib/actions/income";
import { currentYearMonth } from "@/lib/utils";
import { HeroCard } from "@/components/dashboard/hero-card";
import { AllocationCard } from "@/components/dashboard/allocation-card";
import { ExpenseList } from "@/components/dashboard/expense-list";
import { UpcomingBillsStrip } from "@/components/dashboard/upcoming-bills-strip";
import { MonthSwitcher } from "@/components/layout/month-switcher";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const params = await searchParams;
  await seedDefaultTags();

  const def = currentYearMonth();
  const year  = parseInt(params.year  ?? String(def.year));
  const month = parseInt(params.month ?? String(def.month));

  const monthData = await getOrCreateMonth(year, month);
  const [expenseRows, upcomingBills, incomeEntries] = await Promise.all([
    getExpensesForMonth(monthData.id),
    getUpcomingBills(7),
    getIncomeEntries(monthData.id),
  ]);

  const { budgetTotal, actualBalance, possible } = calcIncomeTotals(incomeEntries);
  // Fall back to monthData.income for users who haven't added income entries yet
  const incomeBasis = budgetTotal > 0 ? budgetTotal : (monthData.income ?? 0);

  const totalExpenses = expenseRows.reduce((sum, e) => sum + (e.amountUsd ?? 0), 0);
  const byBucket = (bucket: string) =>
    expenseRows.filter((e) => e.bucket === bucket).reduce((s, e) => s + (e.amountUsd ?? 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-foreground text-xl font-bold">Overview</h2>
          <p className="text-muted-base text-sm">Your month at a glance</p>
        </div>
        <MonthSwitcher year={year} month={month} />
      </div>

      <HeroCard
        budgetTotal={budgetTotal > 0 ? budgetTotal : (monthData.income ?? 0)}
        actualBalance={actualBalance > 0 ? actualBalance : (monthData.income ?? 0)}
        possible={possible}
        openingBalance={monthData.openingBalance ?? 0}
        totalExpenses={totalExpenses}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <AllocationCard bucket="savings" pct={monthData.savingsPct ?? 20} income={incomeBasis} spent={byBucket("savings")} />
        <AllocationCard bucket="bills"   pct={monthData.billsPct  ?? 70} income={incomeBasis} spent={byBucket("bills")} />
        <AllocationCard bucket="wants"   pct={monthData.wantsPct  ?? 10} income={incomeBasis} spent={byBucket("wants")} />
      </div>

      <UpcomingBillsStrip bills={upcomingBills} />
      <ExpenseList expenses={expenseRows as any} />
    </div>
  );
}
```

- [ ] **Step 5: Verify home page**

Navigate to `/`. HeroCard should show "Budget Total" as primary number, "Actual: $X" as secondary. Add income entries via `/income` → return to `/` → numbers update. Allocation cards show "Personal" instead of "Wants".

- [ ] **Step 6: Commit**

```bash
git add components/layout/sidebar.tsx components/layout/bottom-nav.tsx \
  components/dashboard/hero-card.tsx app/(app)/page.tsx
git commit -m "feat: add income nav, update hero card with budget total vs actual balance"
```

---

## Task 8: Final Verification

- [ ] **Step 1: Full flow test**

Start dev server (`npm run dev`) and walk through:

1. **Settings** (`/settings`) — add "Chase Sapphire" card, due day 15. Add "Discover" card, due day 22.
2. **Bills** (`/bills`) — add a monthly utility bill. Add a yearly subscription (iCloud+, March 15) linked to Discover card. Edit the utility — verify form prefills. Check upcoming strip on home only shows bills due this week.
3. **Income** (`/income`) — add biweekly income "Employer X" $2,000 expected. Two entries appear (1st, 15th). Mark first as arrived. Check totals: budget total = $4,000, actual = $2,000.
4. **Goals** (`/goals`) — pots show correct amounts based on income. Add "Roth IRA 30%", "Emergency Fund 50%". Dollar amounts compute correctly. Try to add another 30% — should throw error (over 100%).
5. **Home** (`/`) — hero card shows budget total vs actual. Allocation cards show "Personal" label.

- [ ] **Step 2: Build check**

```bash
npm run build
```

Expected: no TypeScript errors, build completes successfully.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: bills/income/goals — complete feature set"
```
