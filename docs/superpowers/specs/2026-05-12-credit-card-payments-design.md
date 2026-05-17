# Credit Card Payments — Design Spec

**Status:** Approved 2026-05-12
**Preview:** `/preview/payments` (static mock — delete after ship)

## Goal

Track payments made toward credit card balances so users can see what they actually owe on each card, separate from spending behavior. Payments are NOT expenses — they're transfers between accounts, and must not double-count toward "spent this month".

## Core accounting model

For credit card C:
```
currentBalance(C) = SUM(expenses.amountUsd WHERE paymentMethodId = C)
                  − SUM(cardPayments.amount  WHERE creditCardId = C)
```

- Charging the card → expense logged → balance ↑
- Paying the card → cardPayment logged → balance ↓ (no impact on "spent")
- Reconcile → cardPayment with `isAdjustment: true` (hidden from "payments this month" totals; still affects balance)

Computed at read time. No `balance` column on `creditCards`.

## Page layout — `/payments`

```
┌─ Header ────────────────────────────────────────────┐
│ Pay Credit Card                                     │
│ Track what you owe and pay it down                  │
└─────────────────────────────────────────────────────┘

For each credit-type card:
┌─ Card section ──────────────────────────────────────┐
│ 💳 Chase Sapphire Reserve                           │
│ Current balance        $1,247.30                    │
│ ┌─────────────────────────────────────────────────┐ │
│ │ This month: +$420 charges · −$500 payments      │ │
│ └─────────────────────────────────────────────────┘ │
│ [Pay this card]     [Reconcile balance]             │
│                                                     │
│ Recent activity (last 8)                            │
│  +$80   May 11  Costco               (expense)      │
│  −$500  May 5   Payment from Debit   (payment)      │
│  +$120  May 3   Amazon               (expense)      │
│  ...                                                │
└─────────────────────────────────────────────────────┘

Empty state: no credit-type cards → "Add a credit card in Settings"
```

Debit/cash cards do not get a section (payments don't apply).

## Pay-this-card flow

Tap → slide-up sheet:
- **Amount** (number, required, > 0)
- **Paid from** (select: Cash, or any other credit card or debit card)
- **Date** (default today)
- **Note** (optional text)

Submit → `createCardPayment` → toast → sheet closes → activity list updates.

## Reconcile-balance flow

Tap → small inline form:
- "Your statement says you owe: **$ __**"
- Submit → computes `diff = statementBalance − currentBalance`. Inserts a `cardPayment` row with `amount = -diff`, `note = "Adjustment to reconcile"`, `isAdjustment = true`. If `diff > 0` (you owe more than the app thinks), the row has negative amount → balance goes UP by `diff`. If `diff < 0` (less), balance goes DOWN.

## Schema change

```ts
// lib/db/schema.ts — add at end
export const cardPayments = pgTable("card_payments", {
  id:               serial("id").primaryKey(),
  userId:           text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  monthId:          integer("month_id").notNull().references(() => months.id, { onDelete: "cascade" }),
  creditCardId:     integer("credit_card_id").notNull().references(() => creditCards.id, { onDelete: "cascade" }),
  amount:           real("amount").notNull(),                 // positive = paid down; negative = adjustment up
  date:             date("date").notNull(),
  paidFromMethodId: integer("paid_from_method_id").references(() => creditCards.id, { onDelete: "set null" }),  // null = cash
  note:             text("note"),
  isAdjustment:     boolean("is_adjustment").notNull().default(false),
  createdAt:        timestamp("created_at").notNull().defaultNow(),
});
```

Push with `npx dotenv -e .env.local -- npx drizzle-kit push`.

## Actions — `lib/actions/card-payments.ts` (new)

```ts
export async function getCreditCardsWithBalances(): Promise<Array<{
  id: number; name: string; type: "credit" | "debit" | "ath_movil"; dueDay: number | null;
  balance: number;
  thisMonthCharges: number;
  thisMonthPayments: number;
}>>;

export async function getCardActivity(cardId: number, limit?: number): Promise<Array<{
  id: number;
  kind: "expense" | "payment" | "adjustment";
  amount: number;        // signed: positive = balance up; negative = balance down
  date: string;
  description: string;
}>>;

export async function createCardPayment(
  prevState: unknown,
  formData: FormData,
): Promise<{ success: boolean; message: string }>;

export async function reconcileCardBalance(
  cardId: number,
  statementBalance: number,
): Promise<{ success: boolean; message: string }>;
```

All gated by `requireSession()`, scoped to `user.id`.

## Components

| File | Type | Responsibility |
|------|------|----------------|
| `app/(app)/payments/page.tsx` | server | orchestrator; fetches cards with balances + activity |
| `components/payments/card-section.tsx` | server | one card's header, balance, summary, activity list |
| `components/payments/pay-card-sheet.tsx` | client | the slide-up "Pay this card" form |
| `components/payments/reconcile-form.tsx` | client | small inline reconcile form, toggleable |
| `components/payments/activity-row.tsx` | server | one row of activity (expense or payment) |

## Nav integration

- Add **Payments** entry to the desktop sidebar (right under or near Bills).
- On mobile (after the nav redesign ships), it becomes a command-palette entry: "Pay credit card".

## Edge cases

- User has no credit-type cards → empty state with link to Settings → Payment Methods.
- Card has zero activity → empty activity list, balance $0.
- Reconcile when statement === current balance → no-op (don't insert a $0 payment).
- Deleting a credit card cascades to its `cardPayments` rows (FK cascade).
- A payment dated in the past attaches to its month via `monthId`.

## Out of scope

- No statement import / OCR
- No APR / interest tracking
- No min-payment-due reminders
- No reward points
- No transfer between two of YOUR cards (only "paid from" → card to be paid; the from-card is treated as the source whatever it is)
