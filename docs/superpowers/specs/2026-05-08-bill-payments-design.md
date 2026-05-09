# Bill Payments & Averages — Design Spec

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow users to log bill payments with confirmation numbers, receipt screenshots (Vercel Blob), and payment method. Track variable utility bills month-over-month and compute a running average for smarter budgeting. Add contract number field to bills.

**Architecture:** Two schema additions (new columns on `bills`, new `billPayments` table). New `/api/upload` route for Vercel Blob. New server actions for payment CRUD. Updated bills page with "Log Payment" UI and average display.

**Dependencies:** `@vercel/blob` (new), `sonner` (from UX feedback spec).

---

## 1. Schema

### 1.1 New columns on `bills`

```ts
contractNumber: text("contract_number"),          // nullable, set once
isVariable:     boolean("is_variable").notNull().default(false),
```

### 1.2 New table: `billPayments`

```ts
export const billPayments = pgTable("bill_payments", {
  id:                 serial("id").primaryKey(),
  userId:             text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  billId:             integer("bill_id").notNull().references(() => bills.id, { onDelete: "cascade" }),
  paidDate:           date("paid_date").notNull(),
  amountPaid:         real("amount_paid").notNull(),
  paymentMethodId:    integer("payment_method_id").references(() => creditCards.id, { onDelete: "set null" }),
  confirmationNumber: text("confirmation_number"),
  receiptUrl:         text("receipt_url"),         // Vercel Blob URL
  notes:              text("notes"),
  createdAt:          timestamp("created_at").notNull().defaultNow(),
});
```

## 2. Vercel Blob Setup

Install `@vercel/blob`. Add env var `BLOB_READ_WRITE_TOKEN` (provisioned via Vercel dashboard or `vercel env pull`).

**Upload API route** `app/api/upload/route.ts`:

```ts
import { handleUpload } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return handleUpload({
    request,
    onBeforeGenerateToken: async () => ({
      allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
      maximumSizeInBytes: 5 * 1024 * 1024, // 5MB
    }),
    onUploadCompleted: async () => {},
  });
}
```

## 3. Bills Form — New Fields

Add to `BillForm` (and schema):
1. **Contract Number** — text, optional, shown for all bill types
2. **Variable amount** — checkbox "Amount varies each month (e.g. utilities)" — when checked, `isVariable = true`

## 4. Bill Payments — Log Payment UI

### 4.1 Bills List Page

Each bill row gains:
- **"Paid this month" badge** — green badge if a payment exists for the current month
- **Last payment info** — "Last paid $X on {date}" shown as muted text below bill name
- **"Log Payment" button** — opens inline slide-down panel (not a separate page)
- For variable bills: shows `~${avg}` average instead of fixed amount, with a tooltip "Average of N payments"

### 4.2 Log Payment Panel (`components/bills/log-payment-form.tsx`)

Fields:
1. **Amount Paid** — pre-filled with bill's average (if variable) or fixed amount
2. **Paid Date** — date picker, defaults to today
3. **Payment Method** — dropdown of user's saved payment methods + "Cash"
4. **Confirmation Number** — text, optional
5. **Receipt** — file upload (image or PDF, max 5MB), optional. Uses `@vercel/blob` client upload
6. **Notes** — textarea, optional

On submit: save to `billPayments`, revalidate `/bills`, show success toast.

### 4.3 Payment History

Each bill row has an expandable "View payments" section showing past payments:
- Date, amount, payment method, confirmation number, receipt thumbnail (if any)
- Up to 6 most recent, with a "See all" link if more

## 5. Variable Bill Average Logic

```ts
export async function getBillAverage(billId: number): Promise<number | null> {
  // Returns average of all amountPaid for this bill, or null if no payments
  const payments = await db.select({ amount: billPayments.amountPaid })
    .from(billPayments)
    .where(eq(billPayments.billId, billId));
  if (payments.length === 0) return null;
  return payments.reduce((s, p) => s + p.amount, 0) / payments.length;
}
```

**Budget calculation:** When computing bills pot allocation, for variable bills use `average ?? bill.amount`.

`getUserBills()` is updated to include:
- `lastPaymentDate`, `lastPaymentAmount` (from most recent billPayment)
- `averageAmount` (computed across all payments, null if none)
- `paidThisMonth` boolean

## 6. Server Actions (`lib/actions/bill-payments.ts`)

```ts
export async function logBillPayment(prevState: unknown, formData: FormData)
  → { success: boolean; message: string }

export async function getBillPayments(billId: number)
  → billPayments[]

export async function deleteBillPayment(paymentId: number, prevState: unknown, formData: FormData)
  → { success: boolean; message: string }
```

## 7. File Map

```
New:
  lib/actions/bill-payments.ts
  components/bills/log-payment-form.tsx
  components/bills/payment-history.tsx
  app/api/upload/route.ts

Modified:
  lib/db/schema.ts              — new columns + billPayments table
  lib/actions/bills.ts          — getUserBills returns average + payment status
  components/bills/bill-form.tsx — add contractNumber + isVariable fields
  app/(app)/bills/page.tsx      — log payment button, paid badge, average display
```
