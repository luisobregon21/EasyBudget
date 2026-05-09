# UX Feedback — Design Spec

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add success/error feedback to every mutating form action in EasyBudget so users always know if their action succeeded or failed.

**Architecture:** Install `sonner` for toast notifications. Refactor all server actions to return `{ success: boolean; message: string }` instead of throwing. Client forms switch to `useActionState`. Fire-and-forget actions (delete, mark arrived) get thin client wrappers.

---

## 1. Package

Install `sonner`. Add `<Toaster position="bottom-center" richColors />` to `app/layout.tsx`.

## 2. Server Action Signature

All mutating actions gain a `prevState` first parameter and return a result object:

```ts
export async function createBill(prevState: unknown, formData: FormData) {
  try {
    // ... existing logic
    return { success: true, message: "Bill added" }
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Failed to add bill" }
  }
}
```

Actions that receive `id` as a bound argument keep the bound arg first:
```ts
export async function deleteBill(billId: number, prevState: unknown, formData: FormData)
```

## 3. Client Form Pattern

Forms that use `useActionState`:
- `components/bills/bill-form.tsx` — createBill / updateBill
- `components/income/income-form.tsx` — createIncomeEntry
- `components/goals/savings-allocation-list.tsx` — createSavingsAllocation
- `app/(app)/settings/page.tsx` credit card add form

```tsx
const [state, formAction, isPending] = useActionState(action, null);

useEffect(() => {
  if (state?.success) toast.success(state.message);
  if (state?.success === false) toast.error(state.message);
}, [state]);

// Inside JSX:
{state?.success === false && (
  <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
    {state.message}
  </p>
)}

<Button type="submit" disabled={isPending} className="...">
  {isPending ? "Saving..." : submitLabel}
</Button>
```

On success, forms that add new items reset by incrementing a `key` on the form element (forcing remount and clearing fields).

## 4. Fire-and-Forget Action Wrappers

Delete buttons and quick-action buttons (mark arrived, overdue banner Yes/No) become small `"use client"` components:

```tsx
"use client";
import { toast } from "sonner";

export function DeleteButton({ action, label = "Delete" }: { action: () => Promise<{ success: boolean; message: string }>; label?: string }) {
  return (
    <button onClick={async () => {
      const result = await action();
      if (result.success) toast.success(result.message);
      else toast.error(result.message);
    }}>
      {label}
    </button>
  );
}
```

## 5. Affected Actions

All of these get the new signature:
- `createBill`, `updateBill`, `deleteBill`
- `createCreditCard`, `deleteCreditCard`
- `createIncomeEntry`, `updateIncomeEntryStatus`, `deleteIncomeEntry`
- `createSavingsAllocation`, `updateSavingsAllocation`, `deleteSavingsAllocation`

## 6. Loading State

Submit buttons: disabled + "Saving…" text while `isPending`. Delete/quick-action buttons: disabled while the async call is in-flight (local `useState` for pending).

## 7. Success Messages

| Action | Toast message |
|--------|---------------|
| Add bill | "Bill added" |
| Update bill | "Bill updated" |
| Delete bill | "Bill removed" |
| Add credit card | "Card saved" |
| Delete credit card | "Card removed" |
| Add income | "Income added" |
| Mark arrived | "Marked as arrived" |
| Remove income (might arrive) | "Moved to possible" |
| Add allocation | "Destination added" |
| Delete allocation | "Destination removed" |
