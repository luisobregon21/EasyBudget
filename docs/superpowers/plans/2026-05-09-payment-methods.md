# Payment Methods — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify payment method tracking across bills and expenses. Add debit card and ATH Móvil support. Replace hard-coded expense payment picker with user-saved payment methods. Add payment method breakdown to trends.

**Architecture:** Extend `creditCards` table with `type` column and make `dueDay` nullable. Add `paymentMethodId` column to `expenses`. Rename the concept to "Payment Methods" in UI. New `lib/actions/payment-methods.ts` re-exporting from credit-cards for backward compat.

**Tech Stack:** Next.js 15 App Router, Drizzle ORM, `@neondatabase/serverless`, `drizzle-kit push`

---

## File Map

```
Modified:
  lib/db/schema.ts                              — type + nullable dueDay on creditCards; paymentMethodId on expenses
  lib/actions/credit-cards.ts                   — updated createCreditCard (type, nullable dueDay), getPaymentMethods alias
  components/settings/credit-card-form.tsx      — type toggle (Credit/Debit/ATH Móvil), conditional dueDay
  app/(app)/settings/page.tsx                   — rename "Credit Cards" → "Payment Methods", display type badge
  components/bills/bill-form.tsx                — "Pay with" dropdown for ALL bill types (not subscription only)
  lib/actions/bills.ts                          — pass creditCardId for all types, save paymentMethodId
  components/expenses/payment-method-picker.tsx — replace hard-coded with user's saved methods + Cash option
  app/(app)/expenses/new/page.tsx               — fetch payment methods, pass to picker
  lib/actions/expenses.ts                       — save paymentMethodId, derive paymentMethod from type
  app/(app)/trends/page.tsx                     — "By Payment Method" breakdown section

New:
  lib/actions/payment-methods.ts                — getPaymentMethods() + re-exports (backward compat shim)
```

---

### Task 1: Schema — extend creditCards, add paymentMethodId to expenses

**Files:**
- Modify: `lib/db/schema.ts`

- [ ] **Step 1: Update `creditCards` table in `lib/db/schema.ts`**

Change the `creditCards` table definition from:
```ts
export const creditCards = pgTable("credit_cards", {
  id:     serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name:   text("name").notNull(),
  dueDay: integer("due_day").notNull(),
});
```

To:
```ts
export const creditCards = pgTable("credit_cards", {
  id:     serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name:   text("name").notNull(),
  type:   text("type").$type<"credit" | "debit" | "ath_movil">().notNull().default("credit"),
  dueDay: integer("due_day"),  // nullable — only required for credit cards
});
```

- [ ] **Step 2: Add `paymentMethodId` to `expenses` table**

In the `expenses` table definition, add after the `paymentMethod` column:
```ts
paymentMethodId: integer("payment_method_id").references(() => creditCards.id, { onDelete: "set null" }),
```

- [ ] **Step 3: Push schema to database**

```bash
cd /Users/luisobregon/projects/personal_projects/EasyBudget && npx dotenv -e .env.local -- npx drizzle-kit push 2>&1
```

Expected: schema pushed successfully, no errors.

- [ ] **Step 4: Verify TypeScript**

```bash
cd /Users/luisobregon/projects/personal_projects/EasyBudget && npx tsc --noEmit 2>&1 | tail -20
```

Expected: zero errors (or only pre-existing errors unrelated to schema).

- [ ] **Step 5: Commit**

```bash
cd /Users/luisobregon/projects/personal_projects/EasyBudget && git add lib/db/schema.ts && git commit -m "feat: add type+nullable dueDay to creditCards; add paymentMethodId to expenses"
```

---

### Task 2: Update credit-cards actions + create payment-methods shim

**Files:**
- Modify: `lib/actions/credit-cards.ts`
- Create: `lib/actions/payment-methods.ts`

- [ ] **Step 1: Update `createCreditCard` in `lib/actions/credit-cards.ts`**

Replace the current `createCreditCard` with one that handles `type` and conditional `dueDay`:

```ts
export async function createCreditCard(prevState: unknown, formData: FormData): Promise<{ success: boolean; message: string }> {
  try {
    const user = await requireSession();
    const db = getDb();
    const name = (formData.get("name") as string).trim();
    const type = (formData.get("type") as string) as "credit" | "debit" | "ath_movil";
    const dueDayStr = formData.get("dueDay") as string;
    const dueDay = dueDayStr ? parseInt(dueDayStr) : null;

    if (!name) throw new Error("Name is required");
    if (!["credit", "debit", "ath_movil"].includes(type)) throw new Error("Invalid type");
    if (type === "credit" && (!dueDay || dueDay < 1 || dueDay > 31)) throw new Error("Due day is required for credit cards");

    await db.insert(creditCards).values({ userId: user.id!, name, type, dueDay });
    revalidatePath("/settings");
    return { success: true, message: "Payment method saved" };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Failed to save payment method" };
  }
}
```

- [ ] **Step 2: Add `getPaymentMethods` alias to `lib/actions/credit-cards.ts`**

Add this export (it's the same as `getCreditCards` — just an alias):
```ts
export const getPaymentMethods = getCreditCards;
```

- [ ] **Step 3: Create `lib/actions/payment-methods.ts`**

```ts
"use server";
// Re-export all credit-cards actions under the payment-methods name for forward compat.
// The underlying table is still called credit_cards (kept to avoid FK migration complexity).
export {
  getCreditCards,
  getPaymentMethods,
  createCreditCard,
  deleteCreditCard,
} from "@/lib/actions/credit-cards";
```

- [ ] **Step 4: Verify TypeScript**

```bash
cd /Users/luisobregon/projects/personal_projects/EasyBudget && npx tsc --noEmit 2>&1 | tail -10
```

- [ ] **Step 5: Commit**

```bash
cd /Users/luisobregon/projects/personal_projects/EasyBudget && git add lib/actions/credit-cards.ts lib/actions/payment-methods.ts && git commit -m "feat: createCreditCard handles type+nullable dueDay; add payment-methods shim"
```

---

### Task 3: Update Settings page — rename to "Payment Methods", show type badge

**Files:**
- Modify: `components/settings/credit-card-form.tsx`
- Modify: `app/(app)/settings/page.tsx`

- [ ] **Step 1: Update `credit-card-form.tsx` — add type toggle, conditional dueDay**

Read the file first. Replace the form content with one that includes a type selector and conditionally shows dueDay only for credit cards:

```tsx
"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { createCreditCard } from "@/lib/actions/credit-cards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PaymentType = "credit" | "debit" | "ath_movil";

const TYPE_OPTIONS: { value: PaymentType; label: string }[] = [
  { value: "credit",    label: "Credit Card" },
  { value: "debit",     label: "Debit Card"  },
  { value: "ath_movil", label: "ATH Móvil"   },
];

export function AddCardForm() {
  const [formKey, setFormKey] = useState(0);
  const [type, setType] = useState<PaymentType>("credit");
  const [state, formAction, isPending] = useActionState(createCreditCard, null);
  const toastedState = useRef<typeof state>(null);

  useEffect(() => {
    if (!state || state === toastedState.current) return;
    toastedState.current = state;
    if (state.success) {
      toast.success(state.message);
      setFormKey((k) => k + 1);
      setType("credit");
    } else {
      toast.error(state.message);
    }
  }, [state]);

  return (
    <form key={formKey} action={formAction}
      className="rounded-2xl bg-white/[0.03] border border-accent-purple/10 p-4 space-y-3">
      <p className="text-muted-base text-xs uppercase tracking-widest">Add Payment Method</p>

      <div className="space-y-1">
        <Label className="text-muted-base text-[10px] uppercase tracking-widest">Type</Label>
        <div className="flex gap-2 flex-wrap">
          {TYPE_OPTIONS.map((o) => (
            <button key={o.value} type="button" onClick={() => setType(o.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                type === o.value
                  ? "bg-gradient-brand text-white"
                  : "bg-bg-deep border border-accent-purple/20 text-muted-base hover:text-foreground"
              }`}>
              {o.label}
            </button>
          ))}
        </div>
        <input type="hidden" name="type" value={type} />
      </div>

      <div className="flex gap-3">
        <div className="flex-1 space-y-1">
          <Label className="text-muted-base text-[10px] uppercase tracking-widest">Name</Label>
          <Input name="name" required placeholder={
            type === "credit" ? "Chase Sapphire" :
            type === "debit"  ? "FirstBank Debit" : "ATH Móvil"
          }
            className="bg-bg-deep border-accent-purple/20 text-foreground" />
        </div>
        {type === "credit" && (
          <div className="w-24 space-y-1">
            <Label className="text-muted-base text-[10px] uppercase tracking-widest">Due Day</Label>
            <Input name="dueDay" type="number" min="1" max="31" required placeholder="15"
              className="bg-bg-deep border-accent-purple/20 text-foreground" />
          </div>
        )}
      </div>

      {state?.success === false && (
        <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
          {state.message}
        </p>
      )}
      <Button type="submit" disabled={isPending} className="bg-gradient-brand text-white font-bold w-full">
        {isPending ? "Saving…" : "Add Payment Method"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Update `app/(app)/settings/page.tsx`**

Read the file first. Update it to:
- Rename "Credit Cards" heading → "Payment Methods"
- Show type badge next to each payment method name
- Show due day only for credit type

```tsx
import { getCreditCards, deleteCreditCard } from "@/lib/actions/credit-cards";
import { Trash2, CreditCard } from "lucide-react";
import { FireAndForgetButton } from "@/components/ui/fire-and-forget-button";
import { AddCardForm } from "@/components/settings/credit-card-form";

const TYPE_BADGE: Record<string, string> = {
  credit:    "Credit",
  debit:     "Debit",
  ath_movil: "ATH Móvil",
};

export default async function SettingsPage() {
  const cards = await getCreditCards();

  return (
    <div className="space-y-8 max-w-lg">
      <div>
        <h2 className="text-foreground text-xl font-bold">Settings</h2>
        <p className="text-muted-base text-sm">Manage your account preferences</p>
      </div>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <CreditCard size={16} className="text-accent-purple-light" />
          <h3 className="text-foreground font-semibold">Payment Methods</h3>
        </div>

        <div className="rounded-2xl bg-white/[0.03] border border-accent-purple/10 divide-y divide-white/5">
          {cards.length === 0 && (
            <p className="text-muted-base text-sm text-center py-6">No payment methods added yet.</p>
          )}
          {cards.map((card) => (
            <div key={card.id} className="flex items-center justify-between p-4">
              <div>
                <p className="text-foreground font-medium">{card.name}</p>
                <p className="text-muted-base text-xs">
                  {TYPE_BADGE[card.type ?? "credit"] ?? "Credit"}
                  {card.type === "credit" && card.dueDay ? ` · Due day ${card.dueDay}` : ""}
                </p>
              </div>
              <FireAndForgetButton
                action={() => deleteCreditCard(card.id)}
                className="text-muted-base hover:text-red-400 transition-colors"
              >
                <Trash2 size={15} />
              </FireAndForgetButton>
            </div>
          ))}
        </div>

        <AddCardForm />
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd /Users/luisobregon/projects/personal_projects/EasyBudget && npx tsc --noEmit 2>&1 | tail -15
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/luisobregon/projects/personal_projects/EasyBudget && git add components/settings/credit-card-form.tsx app/\(app\)/settings/page.tsx && git commit -m "feat: settings Payment Methods section with type toggle and badge"
```

---

### Task 4: Update BillForm — "Pay with" for all bill types

**Files:**
- Modify: `components/bills/bill-form.tsx`
- Modify: `lib/actions/bills.ts`
- Modify: `app/(app)/bills/new/page.tsx`
- Modify: `app/(app)/bills/[id]/edit/page.tsx`

Currently the "Credit Card" pay-with picker in `BillForm` only shows for `type === "subscription"`. The spec requires it for ALL bill types.

- [ ] **Step 1: Update `BillForm` pay-with field**

Read `components/bills/bill-form.tsx`. Find the block:
```tsx
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
```

Replace it with (no type guard — shown for all bill types):
```tsx
{creditCards.length > 0 && (
  <div className="space-y-1">
    <Label className="text-muted-base text-[10px] uppercase tracking-widest">Pay with (optional)</Label>
    <select name="creditCardId"
      defaultValue={defaultValues.creditCardId ?? "none"}
      className="w-full bg-bg-deep border border-accent-purple/20 text-foreground rounded-xl px-4 py-2.5">
      <option value="none">None</option>
      {creditCards.map((c) => (
        <option key={c.id} value={c.id}>{c.name}</option>
      ))}
    </select>
  </div>
)}
```

Also update the `CreditCard` type in BillForm to include the new `type` field (used for display):
```ts
type CreditCard = { id: number; name: string; dueDay: number | null; type: string };
```

- [ ] **Step 2: Update new/edit bill pages to pass payment methods**

Both `app/(app)/bills/new/page.tsx` and `app/(app)/bills/[id]/edit/page.tsx` currently fetch credit cards and pass them to `BillForm`. Read both files. Confirm they import from `lib/actions/credit-cards` (or `lib/actions/payment-methods`) and that the fetched data includes the new `type` column (it will, since Drizzle selects all columns).

No code changes needed unless the import is wrong — just verify.

- [ ] **Step 3: Verify TypeScript**

```bash
cd /Users/luisobregon/projects/personal_projects/EasyBudget && npx tsc --noEmit 2>&1 | tail -15
```

- [ ] **Step 4: Commit**

```bash
cd /Users/luisobregon/projects/personal_projects/EasyBudget && git add components/bills/bill-form.tsx && git commit -m "feat: BillForm shows Pay with dropdown for all bill types"
```

---

### Task 5: Update expense form — replace hard-coded picker with saved payment methods

**Files:**
- Modify: `components/expenses/payment-method-picker.tsx`
- Modify: `app/(app)/expenses/new/page.tsx`
- Modify: `lib/actions/expenses.ts`

Currently: hard-coded Cash/Debit/Credit radio buttons. Target: dropdown with user's saved payment methods + a built-in Cash option. The `expenses` table gains `paymentMethodId`; the old `paymentMethod` text column is populated from the selected method's type for backward compat.

- [ ] **Step 1: Rewrite `components/expenses/payment-method-picker.tsx`**

```tsx
"use client";

import { useState } from "react";

type SavedMethod = { id: number; name: string; type: string };

interface Props {
  methods: SavedMethod[];
  defaultValue?: string; // "cash" or stringified id
}

const CASH_OPTION = { id: "cash", name: "Cash", type: "cash" } as const;

export function PaymentMethodPicker({ methods, defaultValue = "cash" }: Props) {
  const [selected, setSelected] = useState<string>(defaultValue);

  const allOptions = [CASH_OPTION, ...methods.map((m) => ({ id: String(m.id), name: m.name, type: m.type }))];

  return (
    <div className="space-y-2">
      <input type="hidden" name="paymentMethodId" value={selected} />
      <div className="flex gap-2 flex-wrap">
        {allOptions.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => setSelected(String(o.id))}
            className={`px-4 py-2 rounded-full text-sm border transition-colors ${
              selected === String(o.id)
                ? o.type === "cash"
                  ? "bg-green-500/15 border-green-500/40 text-green-400"
                  : o.type === "credit"
                    ? "bg-pink-500/15 border-pink-500/40 text-pink-400"
                    : "bg-indigo-500/15 border-indigo-500/40 text-indigo-400"
                : "bg-white/[0.04] border-accent-purple/20 text-muted-base hover:text-foreground"
            }`}
          >
            {o.type === "cash" ? "💵" : o.type === "credit" ? "💳" : "🏧"} {o.name}
          </button>
        ))}
      </div>
      {selected !== "cash" && methods.find(m => m.type === "credit" && String(m.id) === selected) && (
        <p className="text-[11px] text-accent-purple-light bg-pink-500/[0.08] border border-pink-500/20 rounded-xl p-3 leading-relaxed">
          Logged now against your budget. Your CC bill at month-end is just a payment — no double-counting.
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update `app/(app)/expenses/new/page.tsx`** to fetch payment methods and pass to picker

Read the current file. Add `getCreditCards` import and pass methods to `PaymentMethodPicker`:

```tsx
import { requireSession } from "@/lib/auth/session";
import { getUserTags } from "@/lib/actions/tags";
import { getCreditCards } from "@/lib/actions/credit-cards";
import { createExpense } from "@/lib/actions/expenses";
import { currentYearMonth } from "@/lib/utils";
import { PaymentMethodPicker } from "@/components/expenses/payment-method-picker";
import { CurrencyPicker } from "@/components/expenses/currency-picker";
import { TagPickerWrapper } from "@/components/expenses/tag-picker-wrapper";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function NewExpensePage() {
  await requireSession();
  const [tags, paymentMethods] = await Promise.all([getUserTags(), getCreditCards()]);
  const { year, month } = currentYearMonth();
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="text-muted-base hover:text-foreground"><ChevronLeft size={20} /></Link>
        <h2 className="text-foreground text-xl font-bold">Add Expense</h2>
      </div>

      <form action={createExpense} className="space-y-5">
        <input type="hidden" name="year"  value={year} />
        <input type="hidden" name="month" value={month} />

        <div className="space-y-1">
          <Label className="text-muted-base text-[10px] uppercase tracking-widest">Amount</Label>
          <CurrencyPicker />
        </div>

        <div className="space-y-1">
          <Label htmlFor="description" className="text-muted-base text-[10px] uppercase tracking-widest">Description</Label>
          <Input id="description" name="description" required placeholder="DoorDash — dinner"
            className="bg-bg-deep border-accent-purple/20 text-foreground" />
        </div>

        <div className="space-y-1">
          <Label htmlFor="date" className="text-muted-base text-[10px] uppercase tracking-widest">Date</Label>
          <Input id="date" name="date" type="date" required defaultValue={today}
            className="bg-bg-deep border-accent-purple/20 text-foreground" />
        </div>

        <div className="space-y-1">
          <Label className="text-muted-base text-[10px] uppercase tracking-widest">Category</Label>
          <TagPickerWrapper tags={tags as any} />
        </div>

        <div className="space-y-1">
          <Label className="text-muted-base text-[10px] uppercase tracking-widest">Paid with</Label>
          <PaymentMethodPicker methods={paymentMethods} />
        </div>

        <Button type="submit" className="w-full bg-gradient-brand text-white font-bold py-3 rounded-xl">
          Save Expense
        </Button>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Update `lib/actions/expenses.ts` — save paymentMethodId, derive paymentMethod from type**

Read the file. Update `createExpense` to handle the new `paymentMethodId` field:

```ts
// Replace the paymentMethod line in the insert:
const paymentMethodIdStr = formData.get("paymentMethodId") as string;
const isCash = !paymentMethodIdStr || paymentMethodIdStr === "cash";
const paymentMethodId = isCash ? null : parseInt(paymentMethodIdStr);

// Derive the legacy paymentMethod text value for backward compat:
// We need to look up the type for this payment method ID.
// Since we don't have a join here, use a simple heuristic:
// - "cash" → "cash"
// - numeric ID present: fetch the card type, map to "debit" or "credit_card"
// Actually simpler: pass the type as a separate hidden field from the picker.
```

**Better approach:** have the picker also write a hidden `paymentMethod` field with the derived value, so the server action doesn't need a DB lookup:

Update the picker to also emit `paymentMethod` derived from the selected option's type:
```tsx
// In PaymentMethodPicker, after the existing hidden input:
const derivedPaymentMethod =
  selected === "cash" ? "cash" :
  allOptions.find(o => String(o.id) === selected)?.type === "credit" ? "credit_card" : "debit";

// Add:
<input type="hidden" name="paymentMethod" value={derivedPaymentMethod} />
```

Then in `createExpense`, also save `paymentMethodId`:
```ts
const paymentMethodIdStr = formData.get("paymentMethodId") as string;
const paymentMethodId = (!paymentMethodIdStr || paymentMethodIdStr === "cash")
  ? null
  : parseInt(paymentMethodIdStr);

await db.insert(expenses).values({
  // ... existing fields ...
  paymentMethod: (formData.get("paymentMethod") as "cash" | "debit" | "credit_card") || "debit",
  paymentMethodId,
  // ... rest of fields ...
});
```

- [ ] **Step 4: Verify TypeScript**

```bash
cd /Users/luisobregon/projects/personal_projects/EasyBudget && npx tsc --noEmit 2>&1 | tail -15
```

Fix any errors.

- [ ] **Step 5: Commit**

```bash
cd /Users/luisobregon/projects/personal_projects/EasyBudget && git add components/expenses/payment-method-picker.tsx app/\(app\)/expenses/new/page.tsx lib/actions/expenses.ts && git commit -m "feat: expense picker uses saved payment methods; save paymentMethodId"
```

---

### Task 6: Trends — "By Payment Method" breakdown

**Files:**
- Modify: `app/(app)/trends/page.tsx`
- Modify: `lib/actions/expenses.ts` (add `getExpensesByPaymentMethod`)

Currently the trends page just says "Coming soon". Add a real page with a "By Payment Method" breakdown for the selected month.

- [ ] **Step 1: Add `getExpensesByPaymentMethod` to `lib/actions/expenses.ts`**

```ts
export async function getExpensesByPaymentMethod(monthId: number) {
  const user = await requireSession();
  const db = getDb();

  const rows = await db.select({
    paymentMethod:   expenses.paymentMethod,
    paymentMethodId: expenses.paymentMethodId,
    methodName:      creditCards.name,
    methodType:      creditCards.type,
    amountUsd:       expenses.amountUsd,
  })
  .from(expenses)
  .leftJoin(creditCards, eq(expenses.paymentMethodId, creditCards.id))
  .where(and(eq(expenses.monthId, monthId), eq(expenses.userId, user.id!)));

  // Group by payment method
  const groups: Record<string, { name: string; total: number }> = {};
  for (const row of rows) {
    const key = row.paymentMethodId ? String(row.paymentMethodId) : "cash";
    const name = row.methodName ?? (row.paymentMethod === "cash" ? "Cash" : row.paymentMethod === "credit_card" ? "Credit Card" : "Debit Card");
    if (!groups[key]) groups[key] = { name, total: 0 };
    groups[key].total += row.amountUsd;
  }

  return Object.values(groups)
    .filter((g) => g.total > 0)
    .sort((a, b) => b.total - a.total);
}
```

Also add import for `creditCards` to the import line at the top of expenses.ts:
```ts
import { getDb, expenses, tags, trips, months, creditCards } from "@/lib/db";
```

- [ ] **Step 2: Rewrite `app/(app)/trends/page.tsx`**

```tsx
import { getOrCreateMonth } from "@/lib/actions/months";
import { getExpensesForMonth, getExpensesByPaymentMethod } from "@/lib/actions/expenses";
import { currentYearMonth, formatCurrency } from "@/lib/utils";
import { MonthSwitcher } from "@/components/layout/month-switcher";

export default async function TrendsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const params = await searchParams;
  const def = currentYearMonth();
  const year  = parseInt(params.year  ?? String(def.year));
  const month = parseInt(params.month ?? String(def.month));

  const monthData = await getOrCreateMonth(year, month);
  const [expenses, byMethod] = await Promise.all([
    getExpensesForMonth(monthData.id),
    getExpensesByPaymentMethod(monthData.id),
  ]);

  const totalSpent = expenses.reduce((s, e) => s + e.amountUsd, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-foreground text-xl font-bold">Trends</h2>
          <p className="text-muted-base text-sm">Spending patterns this month</p>
        </div>
        <MonthSwitcher year={year} month={month} />
      </div>

      {byMethod.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-foreground font-semibold">By Payment Method</h3>
          <div className="rounded-2xl bg-white/[0.03] border border-accent-purple/10 divide-y divide-white/5">
            {byMethod.map((m) => {
              const pct = totalSpent > 0 ? Math.round((m.total / totalSpent) * 100) : 0;
              return (
                <div key={m.name} className="flex items-center justify-between p-4 gap-3">
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
        </section>
      )}

      {byMethod.length === 0 && (
        <p className="text-muted-base text-sm text-center py-8">No expenses recorded this month yet.</p>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd /Users/luisobregon/projects/personal_projects/EasyBudget && npx tsc --noEmit 2>&1 | tail -15
```

- [ ] **Step 4: Commit**

```bash
cd /Users/luisobregon/projects/personal_projects/EasyBudget && git add lib/actions/expenses.ts app/\(app\)/trends/page.tsx && git commit -m "feat: trends page with By Payment Method breakdown"
```

---

### Task 7: Final build check

**Files:** none

- [ ] **Step 1: Full TypeScript check**

```bash
cd /Users/luisobregon/projects/personal_projects/EasyBudget && npx tsc --noEmit 2>&1
```

Expected: zero errors.

- [ ] **Step 2: Next.js build**

```bash
cd /Users/luisobregon/projects/personal_projects/EasyBudget && npx dotenv -e .env.local -- npx next build 2>&1 | tail -40
```

Expected: build completes successfully.

- [ ] **Step 3: Commit any build fixes**

If any fixes were needed:
```bash
cd /Users/luisobregon/projects/personal_projects/EasyBudget && git add -A && git commit -m "fix: resolve build errors for payment methods feature"
```

---

## Self-Review

**Spec coverage:**
- ✅ Schema: `type` + nullable `dueDay` on creditCards → Task 1
- ✅ Schema: `paymentMethodId` on expenses → Task 1
- ✅ `createCreditCard` handles type + conditional dueDay → Task 2
- ✅ `getPaymentMethods` alias → Task 2
- ✅ Settings: "Payment Methods" heading, type badge, conditional due day display → Task 3
- ✅ Add form: type toggle (Credit/Debit/ATH Móvil), conditional dueDay field → Task 3
- ✅ BillForm: "Pay with" for ALL bill types (not subscription only) → Task 4
- ✅ Expenses: picker uses saved methods + Cash; emits paymentMethodId → Task 5
- ✅ Expenses: paymentMethod text column populated from type (backward compat) → Task 5
- ✅ Trends: "By Payment Method" breakdown with totals + bar → Task 6

**Type consistency:** `creditCards.type` is `"credit" | "debit" | "ath_movil"`. Payment method derivation for expenses: credit → "credit_card", debit/ath_movil → "debit", cash → "cash". Consistent across picker, action, and trends query.
