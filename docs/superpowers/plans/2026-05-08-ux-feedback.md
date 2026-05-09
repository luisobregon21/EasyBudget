# UX Feedback — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add success/error toast feedback and loading states to every mutating form action in EasyBudget.

**Architecture:** Install `sonner`. Refactor all server actions to return `{ success: boolean; message: string }`. Client forms switch to `useActionState`. Delete/quick-action buttons become thin client wrappers that call the action and fire a toast.

**Tech Stack:** Next.js 15 App Router, sonner, React `useActionState`

---

## File Map

```
Modified:
  package.json                                  — add sonner
  app/layout.tsx                                — add <Toaster />
  lib/actions/bills.ts                          — new signatures for createBill, updateBill, deleteBill
  lib/actions/credit-cards.ts                   — new signatures for createCreditCard, deleteCreditCard
  lib/actions/income.ts                         — new signatures for createIncomeEntry, updateIncomeEntryStatus, deleteIncomeEntry
  lib/actions/goals.ts                          — new signatures for createSavingsAllocation, updateSavingsAllocation, deleteSavingsAllocation
  components/bills/bill-form.tsx                — useActionState, toast, inline error, loading state
  components/income/income-form.tsx             — useActionState, toast, inline error, loading state
  components/income/income-entry-list.tsx       — client wrapper for mark-arrived + delete
  components/income/overdue-banner.tsx          — client wrapper for Yes / No buttons
  components/goals/savings-allocation-list.tsx  — client wrapper, useActionState for add form
  app/(app)/bills/page.tsx                      — client delete wrapper
  app/(app)/settings/page.tsx                   — extract client add-card form + client delete wrapper

New:
  components/ui/fire-and-forget-button.tsx      — reusable async button with toast + pending state
  components/settings/add-card-form.tsx         — client add-card form (extracted from server settings page)
```

---

### Task 1: Install sonner and add Toaster to root layout

**Files:**
- Modify: `package.json`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Install sonner**

```bash
cd /Users/luisobregon/projects/personal_projects/EasyBudget && npm install sonner
```

Expected: sonner added to `node_modules` and `package.json`.

- [ ] **Step 2: Add `<Toaster />` to root layout**

Replace the body in `app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PwaRegister } from "@/components/pwa-register";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EasyBudget",
  description: "Track your income, bills, and spending habits",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <PwaRegister />
        {children}
        <Toaster position="bottom-center" richColors />
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Verify build compiles**

```bash
cd /Users/luisobregon/projects/personal_projects/EasyBudget && npx tsc --noEmit 2>&1 | tail -20
```

Expected: no errors related to sonner import.

- [ ] **Step 4: Commit**

```bash
cd /Users/luisobregon/projects/personal_projects/EasyBudget && git add package.json package-lock.json app/layout.tsx && git commit -m "feat: install sonner, add Toaster to root layout"
```

---

### Task 2: Create `FireAndForgetButton` — reusable async button with toast

**Files:**
- Create: `components/ui/fire-and-forget-button.tsx`

This component handles any async action that doesn't use a form — delete buttons, quick-action buttons. It fires the action, shows a toast, and disables itself while in-flight.

- [ ] **Step 1: Create the component**

```tsx
// components/ui/fire-and-forget-button.tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";

interface Props {
  action: () => Promise<{ success: boolean; message: string }>;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export function FireAndForgetButton({ action, children, className, disabled }: Props) {
  const [pending, setPending] = useState(false);

  async function handleClick() {
    if (pending) return;
    setPending(true);
    try {
      const result = await action();
      if (result.success) toast.success(result.message);
      else toast.error(result.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || pending}
      className={className}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/luisobregon/projects/personal_projects/EasyBudget && git add components/ui/fire-and-forget-button.tsx && git commit -m "feat: add FireAndForgetButton client component"
```

---

### Task 3: Update server actions — bills

**Files:**
- Modify: `lib/actions/bills.ts`

Current signatures: `createBill(formData)`, `updateBill(billId, formData)`, `deleteBill(billId)` — all return void.

Target signatures: all return `{ success: boolean; message: string }` and accept `prevState` as first arg (or `billId` then `prevState` for bound-arg actions).

- [ ] **Step 1: Update `createBill`**

Find the `createBill` function and wrap in try/catch returning a result object. Add `prevState: unknown` as the first argument:

```ts
export async function createBill(prevState: unknown, formData: FormData): Promise<{ success: boolean; message: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, message: "Not authenticated" };
    // ... existing logic unchanged ...
    revalidatePath("/bills");
    return { success: true, message: "Bill added" };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Failed to add bill" };
  }
}
```

- [ ] **Step 2: Update `updateBill`**

`updateBill` is called with a bound `billId`. Its signature becomes `(billId: number, prevState: unknown, formData: FormData)`:

```ts
export async function updateBill(billId: number, prevState: unknown, formData: FormData): Promise<{ success: boolean; message: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, message: "Not authenticated" };
    // ... existing logic unchanged ...
    revalidatePath("/bills");
    return { success: true, message: "Bill updated" };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Failed to update bill" };
  }
}
```

- [ ] **Step 3: Update `deleteBill`**

`deleteBill` is a fire-and-forget (no form state needed), so it only needs to return a result — no `prevState`:

```ts
export async function deleteBill(billId: number): Promise<{ success: boolean; message: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, message: "Not authenticated" };
    const db = getDb();
    await db.delete(bills).where(and(eq(bills.id, billId), eq(bills.userId, session.user.id)));
    revalidatePath("/bills");
    return { success: true, message: "Bill removed" };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Failed to remove bill" };
  }
}
```

- [ ] **Step 4: Verify TypeScript**

```bash
cd /Users/luisobregon/projects/personal_projects/EasyBudget && npx tsc --noEmit 2>&1 | grep "bills"
```

Expected: no errors in bills.ts.

- [ ] **Step 5: Commit**

```bash
cd /Users/luisobregon/projects/personal_projects/EasyBudget && git add lib/actions/bills.ts && git commit -m "feat: bills actions return result objects"
```

---

### Task 4: Update server actions — credit cards, goals, income

**Files:**
- Modify: `lib/actions/credit-cards.ts`
- Modify: `lib/actions/goals.ts`
- Modify: `lib/actions/income.ts`

Apply the same pattern as Task 3.

- [ ] **Step 1: Update `createCreditCard` and `deleteCreditCard` in `lib/actions/credit-cards.ts`**

```ts
export async function createCreditCard(prevState: unknown, formData: FormData): Promise<{ success: boolean; message: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, message: "Not authenticated" };
    const name = formData.get("name") as string;
    const dueDay = parseInt(formData.get("dueDay") as string);
    if (!name || isNaN(dueDay) || dueDay < 1 || dueDay > 31)
      return { success: false, message: "Invalid card details" };
    const db = getDb();
    await db.insert(creditCards).values({ userId: session.user.id, name, dueDay });
    revalidatePath("/settings");
    return { success: true, message: "Card saved" };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Failed to save card" };
  }
}

export async function deleteCreditCard(cardId: number): Promise<{ success: boolean; message: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, message: "Not authenticated" };
    const db = getDb();
    await db.delete(creditCards).where(and(eq(creditCards.id, cardId), eq(creditCards.userId, session.user.id)));
    revalidatePath("/settings");
    return { success: true, message: "Card removed" };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Failed to remove card" };
  }
}
```

- [ ] **Step 2: Update `createSavingsAllocation`, `updateSavingsAllocation`, `deleteSavingsAllocation` in `lib/actions/goals.ts`**

```ts
export async function createSavingsAllocation(prevState: unknown, formData: FormData): Promise<{ success: boolean; message: string }> {
  try {
    // ... existing logic unchanged ...
    revalidatePath("/goals");
    return { success: true, message: "Destination added" };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Failed to add destination" };
  }
}

export async function updateSavingsAllocation(allocationId: number, prevState: unknown, formData: FormData): Promise<{ success: boolean; message: string }> {
  try {
    // ... existing logic unchanged ...
    revalidatePath("/goals");
    return { success: true, message: "Destination updated" };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Failed to update destination" };
  }
}

export async function deleteSavingsAllocation(allocationId: number): Promise<{ success: boolean; message: string }> {
  try {
    // ... existing logic unchanged ...
    revalidatePath("/goals");
    return { success: true, message: "Destination removed" };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Failed to remove destination" };
  }
}
```

- [ ] **Step 3: Update income actions in `lib/actions/income.ts`**

```ts
export async function createIncomeEntry(prevState: unknown, formData: FormData): Promise<{ success: boolean; message: string }> {
  try {
    // ... existing logic unchanged ...
    revalidatePath("/income");
    return { success: true, message: "Income added" };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Failed to add income" };
  }
}

export async function updateIncomeEntryStatus(entryId: number, status: string): Promise<{ success: boolean; message: string }> {
  try {
    // ... existing logic unchanged ...
    revalidatePath("/income");
    if (status === "arrived") return { success: true, message: "Marked as arrived" };
    return { success: true, message: "Moved to possible" };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Failed to update" };
  }
}

export async function deleteIncomeEntry(entryId: number): Promise<{ success: boolean; message: string }> {
  try {
    // ... existing logic unchanged ...
    revalidatePath("/income");
    return { success: true, message: "Income removed" };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Failed to remove income" };
  }
}
```

Note: `updateIncomeEntryStatus` does NOT get `prevState` because it is always called as a fire-and-forget (via `FireAndForgetButton`), never bound to a `useActionState` form. It only needs to return the result object.

- [ ] **Step 4: Verify TypeScript**

```bash
cd /Users/luisobregon/projects/personal_projects/EasyBudget && npx tsc --noEmit 2>&1 | tail -30
```

Expected: no type errors.

- [ ] **Step 5: Commit**

```bash
cd /Users/luisobregon/projects/personal_projects/EasyBudget && git add lib/actions/credit-cards.ts lib/actions/goals.ts lib/actions/income.ts && git commit -m "feat: credit-cards, goals, income actions return result objects"
```

---

### Task 5: Update `BillForm` — useActionState, toast, inline error, loading

**Files:**
- Modify: `components/bills/bill-form.tsx`

Current: takes `action: (formData: FormData) => Promise<void>` prop and renders a plain `<form action={action}>`. No feedback.

Target: takes `action: (prevState: unknown, formData: FormData) => Promise<{ success: boolean; message: string }>` prop, uses `useActionState`, shows toast on success, shows inline error on failure, shows "Saving…" on pending.

- [ ] **Step 1: Update BillForm component**

Replace the top of `components/bills/bill-form.tsx` with:

```tsx
"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
// ... keep all existing imports ...

type ActionFn = (prevState: unknown, formData: FormData) => Promise<{ success: boolean; message: string }>;

export function BillForm({ action, bill, paymentMethods }: {
  action: ActionFn;
  bill?: { /* existing bill type */ };
  paymentMethods?: { id: number; name: string }[];
}) {
  const [state, formAction, isPending] = useActionState(action, null);

  useEffect(() => {
    if (state?.success) toast.success(state.message);
    if (state?.success === false) toast.error(state.message);
  }, [state]);

  return (
    <form action={formAction} className="space-y-4">
      {/* ... all existing fields unchanged ... */}

      {state?.success === false && (
        <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
          {state.message}
        </p>
      )}

      <Button type="submit" disabled={isPending} className="w-full bg-gradient-brand text-white font-bold">
        {isPending ? "Saving…" : (bill ? "Save Changes" : "Add Bill")}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Update callers of BillForm**

In `app/(app)/bills/new/page.tsx`, the `action` prop passed is `createBill`. Update the import and prop if needed — the type now expects `(prevState, formData) => Promise<{ success, message }>` which is what `createBill` now returns.

In `app/(app)/bills/[id]/edit/page.tsx`, the action prop is `updateBill.bind(null, billId)`. With the new signature `updateBill(billId, prevState, formData)`, the bound action becomes `(prevState, formData) => Promise<...>` which matches. No caller changes needed beyond confirming the bind is correct.

- [ ] **Step 3: Verify TypeScript**

```bash
cd /Users/luisobregon/projects/personal_projects/EasyBudget && npx tsc --noEmit 2>&1 | grep -i "bill-form\|bills/new\|bills.*edit"
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/luisobregon/projects/personal_projects/EasyBudget && git add components/bills/bill-form.tsx && git commit -m "feat: BillForm uses useActionState with toast and loading state"
```

---

### Task 6: Update `IncomeForm` — useActionState, toast, inline error, loading

**Files:**
- Modify: `components/income/income-form.tsx`

Current: calls `createIncomeEntry` directly in a `handleSubmit` handler. Closes form on success, no error feedback. The one-time date picker has `required` always present even when hidden.

Target: uses `useActionState`, shows toast on success (and resets form by incrementing a key on success), shows inline error on failure, shows "Saving…" on pending. Also fix: `required` on expectedDate only when `frequency === "one_time"`.

- [ ] **Step 1: Update IncomeForm**

```tsx
"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { createIncomeEntry } from "@/lib/actions/income";
// ... keep all existing imports ...

export function IncomeForm({ monthId }: { monthId: number }) {
  const [formKey, setFormKey] = useState(0);
  const [frequency, setFrequency] = useState("one_time");

  const action = createIncomeEntry.bind(null, monthId); // monthId passed as first bound arg — see note below
  const [state, formAction, isPending] = useActionState(action, null);

  useEffect(() => {
    if (state?.success) {
      toast.success(state.message);
      setFormKey((k) => k + 1); // reset form fields
    }
    if (state?.success === false) toast.error(state.message);
  }, [state]);

  return (
    <form key={formKey} action={formAction} className="rounded-2xl bg-white/[0.03] border border-accent-purple/10 p-4 space-y-3">
      {/* existing fields... */}

      {/* Fix: expectedDate required only when visible */}
      {frequency === "one_time" && (
        <div className="space-y-1">
          <Label>Expected Date</Label>
          <Input type="date" name="expectedDate" required />
        </div>
      )}

      {state?.success === false && (
        <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
          {state.message}
        </p>
      )}

      <Button type="submit" disabled={isPending} className="w-full bg-gradient-brand text-white font-bold">
        {isPending ? "Saving…" : "Add Income"}
      </Button>
    </form>
  );
}
```

**Important note on `createIncomeEntry` binding:** The current `createIncomeEntry` takes `(monthId, formData)`. After the Task 4 change it takes `(prevState, formData)` — but `monthId` is no longer passed this way. Instead, pass `monthId` as a hidden input in the form: `<input type="hidden" name="monthId" value={monthId} />`. The action reads it from `formData.get("monthId")`. This avoids the need for currying and is simpler.

Update `lib/actions/income.ts`'s `createIncomeEntry` to read `monthId` from formData:

```ts
export async function createIncomeEntry(prevState: unknown, formData: FormData): Promise<{ success: boolean; message: string }> {
  const monthId = parseInt(formData.get("monthId") as string);
  // ... rest unchanged
}
```

And remove the `monthId` parameter from the function signature. The `IncomeForm` does NOT need to bind — just pass `createIncomeEntry` directly.

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/luisobregon/projects/personal_projects/EasyBudget && npx tsc --noEmit 2>&1 | grep -i "income-form\|income\.ts"
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/luisobregon/projects/personal_projects/EasyBudget && git add components/income/income-form.tsx lib/actions/income.ts && git commit -m "feat: IncomeForm uses useActionState; fix expectedDate required attr; monthId via hidden input"
```

---

### Task 7: Update `SavingsAllocationList` — client wrapper with useActionState

**Files:**
- Modify: `components/goals/savings-allocation-list.tsx`

Current: server component using `form action={createSavingsAllocation}` directly. No feedback, no loading.

Target: convert to `"use client"`, use `useActionState` for the add form, use `FireAndForgetButton` for the delete buttons.

- [ ] **Step 1: Convert to client component**

```tsx
"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { deleteSavingsAllocation, createSavingsAllocation } from "@/lib/actions/goals";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2 } from "lucide-react";
import { FireAndForgetButton } from "@/components/ui/fire-and-forget-button";

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

  const [formKey, setFormKey] = useState(0);
  const [state, formAction, isPending] = useActionState(createSavingsAllocation, null);

  useEffect(() => {
    if (state?.success) {
      toast.success(state.message);
      setFormKey((k) => k + 1);
    }
    if (state?.success === false) toast.error(state.message);
  }, [state]);

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
                <FireAndForgetButton
                  action={() => deleteSavingsAllocation(a.id)}
                  className="text-muted-base hover:text-red-400 transition-colors"
                >
                  <Trash2 size={14} />
                </FireAndForgetButton>
              </div>
            </div>
          );
        })}
      </div>

      <form key={formKey} action={formAction}
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
        {state?.success === false && (
          <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
            {state.message}
          </p>
        )}
        <Button type="submit" disabled={isPending} className="w-full bg-gradient-brand text-white font-bold">
          {isPending ? "Saving…" : "Add Destination"}
        </Button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/luisobregon/projects/personal_projects/EasyBudget && npx tsc --noEmit 2>&1 | grep -i "savings-allocation\|goals"
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/luisobregon/projects/personal_projects/EasyBudget && git add components/goals/savings-allocation-list.tsx && git commit -m "feat: SavingsAllocationList uses useActionState and FireAndForgetButton"
```

---

### Task 8: Update Settings page — extract client form components

**Files:**
- Create: `components/settings/add-card-form.tsx`
- Modify: `app/(app)/settings/page.tsx`

The settings page is a Server Component. The add-card form needs `useActionState` (client), and the delete buttons need `FireAndForgetButton` (client). Extract both into small client components.

- [ ] **Step 1: Create `components/settings/add-card-form.tsx`**

```tsx
"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { createCreditCard } from "@/lib/actions/credit-cards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AddCardForm() {
  const [formKey, setFormKey] = useState(0);
  const [state, formAction, isPending] = useActionState(createCreditCard, null);

  useEffect(() => {
    if (state?.success) {
      toast.success(state.message);
      setFormKey((k) => k + 1);
    }
    if (state?.success === false) toast.error(state.message);
  }, [state]);

  return (
    <form key={formKey} action={formAction}
      className="rounded-2xl bg-white/[0.03] border border-accent-purple/10 p-4 space-y-3">
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
      {state?.success === false && (
        <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
          {state.message}
        </p>
      )}
      <Button type="submit" disabled={isPending} className="bg-gradient-brand text-white font-bold w-full">
        {isPending ? "Saving…" : "Add Card"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Update `app/(app)/settings/page.tsx`**

Replace the inline delete form and add form with client components:

```tsx
import { getCreditCards, deleteCreditCard } from "@/lib/actions/credit-cards";
import { Button } from "@/components/ui/button";
import { Trash2, CreditCard } from "lucide-react";
import { FireAndForgetButton } from "@/components/ui/fire-and-forget-button";
import { AddCardForm } from "@/components/settings/add-card-form";

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
cd /Users/luisobregon/projects/personal_projects/EasyBudget && npx tsc --noEmit 2>&1 | grep -i "settings\|credit-card\|add-card"
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/luisobregon/projects/personal_projects/EasyBudget && git add components/settings/add-card-form.tsx app/\(app\)/settings/page.tsx && git commit -m "feat: settings page uses AddCardForm and FireAndForgetButton"
```

---

### Task 9: Update bills page — client delete button

**Files:**
- Modify: `app/(app)/bills/page.tsx`

Current: inline `handleDelete` server action wrapper. Target: use `FireAndForgetButton` with `deleteBill`.

- [ ] **Step 1: Update `app/(app)/bills/page.tsx`**

Remove the `handleDelete` inline server action. Replace the `<form action={...}>` delete button with `FireAndForgetButton`:

```tsx
import { getUserBills, deleteBill } from "@/lib/actions/bills";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Trash2, Plus, Pencil } from "lucide-react";
import { FireAndForgetButton } from "@/components/ui/fire-and-forget-button";

// ... TYPE_ICON and MONTHS_SHORT unchanged ...

export default async function BillsPage() {
  const billsList = await getUserBills();

  return (
    <div className="space-y-5">
      {/* header unchanged */}

      <div className="rounded-2xl bg-white/[0.03] border border-accent-purple/10 divide-y divide-white/5">
        {billsList.length === 0 && (
          <p className="text-muted-base text-sm text-center py-8">No bills yet. Add your first one.</p>
        )}
        {billsList.map((b) => {
          const dueLine = b.frequency === "yearly"
            ? `Renews ${MONTHS_SHORT[(b.renewalMonth ?? 1) - 1]} ${b.renewalDay ?? "?"} · Yearly`
            : `Due day ${b.dueDay} · Monthly`;
          return (
            <div key={b.id} className="flex items-center justify-between p-4">
              {/* left side unchanged */}
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-amber-400 font-bold">{formatCurrency(b.amount)}</span>
                <Link href={`/bills/${b.id}/edit`} className="text-muted-base hover:text-foreground transition-colors">
                  <Pencil size={14} />
                </Link>
                <FireAndForgetButton
                  action={() => deleteBill(b.id)}
                  className="text-muted-base hover:text-red-400 transition-colors"
                >
                  <Trash2 size={15} />
                </FireAndForgetButton>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/luisobregon/projects/personal_projects/EasyBudget && git add app/\(app\)/bills/page.tsx && git commit -m "feat: bills page delete uses FireAndForgetButton"
```

---

### Task 10: Update income components — client wrappers for quick actions

**Files:**
- Modify: `components/income/income-entry-list.tsx`
- Modify: `components/income/overdue-banner.tsx`

**income-entry-list.tsx** — replace `<form action={markArrivedAction}>` with `FireAndForgetButton`.

**overdue-banner.tsx** — currently a server component with inline `"use server"` action functions. Convert to `"use client"` using `FireAndForgetButton`.

- [ ] **Step 1: Update `components/income/income-entry-list.tsx`**

Add `"use client"` directive. Replace `<form action={...}>` for Mark arrived with `FireAndForgetButton`:

```tsx
"use client";

import { updateIncomeEntryStatus } from "@/lib/actions/income";
import { formatCurrency } from "@/lib/utils";
import { FireAndForgetButton } from "@/components/ui/fire-and-forget-button";

// ... type and STATUS_STYLE unchanged ...

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
                <FireAndForgetButton
                  action={() => updateIncomeEntryStatus(e.id, "arrived")}
                  className="text-[10px] text-green-400 hover:text-green-300 underline"
                >
                  Mark arrived
                </FireAndForgetButton>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Update `components/income/overdue-banner.tsx`**

Convert from server component (with inline `"use server"` functions) to client component using `FireAndForgetButton`:

```tsx
"use client";

import { updateIncomeEntryStatus } from "@/lib/actions/income";
import { formatCurrency } from "@/lib/utils";
import { FireAndForgetButton } from "@/components/ui/fire-and-forget-button";

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
        <FireAndForgetButton
          action={() => updateIncomeEntryStatus(entry.id, "arrived")}
          className="text-xs text-green-400 hover:text-green-300 underline whitespace-nowrap"
        >
          Yes
        </FireAndForgetButton>
        <FireAndForgetButton
          action={() => updateIncomeEntryStatus(entry.id, "might_arrive")}
          className="text-xs text-muted-base hover:text-foreground underline whitespace-nowrap"
        >
          No, remove
        </FireAndForgetButton>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd /Users/luisobregon/projects/personal_projects/EasyBudget && npx tsc --noEmit 2>&1 | tail -30
```

Expected: no type errors across the project.

- [ ] **Step 4: Commit**

```bash
cd /Users/luisobregon/projects/personal_projects/EasyBudget && git add components/income/income-entry-list.tsx components/income/overdue-banner.tsx && git commit -m "feat: income entry list and overdue banner use FireAndForgetButton"
```

---

### Task 11: Final build check

**Files:** none

- [ ] **Step 1: TypeScript full check**

```bash
cd /Users/luisobregon/projects/personal_projects/EasyBudget && npx tsc --noEmit 2>&1
```

Expected: zero errors.

- [ ] **Step 2: Next.js build**

```bash
cd /Users/luisobregon/projects/personal_projects/EasyBudget && npx dotenv -e .env.local -- npx next build 2>&1 | tail -40
```

Expected: build completes with no errors. Warnings about page sizes are acceptable.

- [ ] **Step 3: Manual smoke test (dev server)**

```bash
cd /Users/luisobregon/projects/personal_projects/EasyBudget && npm run dev
```

1. Open http://localhost:3000/bills — add a bill → green "Bill added" toast appears, form resets
2. Delete a bill → "Bill removed" toast
3. Open /income — add an income entry → "Income added" toast
4. Mark arrived on an entry → "Marked as arrived" toast
5. Open /goals — add an allocation → "Destination added" toast
6. Open /settings — add a credit card → "Card saved" toast, delete it → "Card removed" toast
7. Trigger a validation error (e.g., submit empty bill form) → red inline error + "toast.error" appears

- [ ] **Step 4: Commit**

No file changes — if build is clean, tag the work complete.

```bash
cd /Users/luisobregon/projects/personal_projects/EasyBudget && git log --oneline -10
```

---

## Self-Review

**Spec coverage:**
- ✅ Install sonner → Task 1
- ✅ `<Toaster position="bottom-center" richColors />` → Task 1
- ✅ All mutating actions return `{ success, message }` → Tasks 3, 4
- ✅ `prevState` first arg on form actions → Tasks 3, 4
- ✅ `useActionState` on BillForm → Task 5
- ✅ `useActionState` on IncomeForm + expectedDate required fix → Task 6
- ✅ `useActionState` on SavingsAllocationList → Task 7
- ✅ Settings page add-card form → Task 8
- ✅ Fire-and-forget delete on bills page → Task 9
- ✅ Fire-and-forget mark arrived / overdue banner → Task 10
- ✅ Loading states ("Saving…", disabled) → Tasks 5, 6, 7, 8
- ✅ Inline error display → Tasks 5, 6, 7, 8
- ✅ Form reset on success (key increment) → Tasks 6, 7, 8
- ✅ All success messages match spec table → Tasks 3, 4

**Type consistency:** `FireAndForgetButton` accepts `() => Promise<{ success, message }>`. All fire-and-forget callers pass arrow functions wrapping the server actions (which now return that type). `useActionState` callers pass `(prevState, formData)` functions. Consistent throughout.
