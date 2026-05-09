# Payment Methods — Design Spec

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Unify payment method tracking across bills and expenses. Add debit card and ATH Móvil support. Replace the hard-coded expense payment picker with user-saved payment methods.

**Architecture:** Extend the existing `creditCards` table with a `type` column and nullable `dueDay`. Rename the concept to "Payment Methods" in the UI everywhere. Update bills form, expenses form, and settings page. Add payment method breakdown to trends.

---

## 1. Schema Change

Modify `creditCards` table (keep table name to avoid breaking FK references):

```ts
// Add:
type: text("type").$type<"credit" | "debit" | "ath_movil">().notNull().default("credit"),
// Change dueDay to nullable:
dueDay: integer("due_day"),  // required only when type = "credit"
```

Run `drizzle-kit push` after schema change.

## 2. Settings Page — Payment Methods Section

Rename "Credit Cards" section to "Payment Methods".

**List display:**
- Credit: `{name} · Due day {dueDay} · Credit`
- Debit: `{name} · Debit`  
- ATH Móvil: `{name} · ATH Móvil`

**Add form fields:**
1. **Name** — text, required (e.g. "Chase Sapphire", "FirstBank Debit", "ATH Móvil")
2. **Type** — toggle: Credit Card | Debit Card | ATH Móvil
3. **Due Day** — number 1–31, only shown when type = "credit"

**Server actions updated:**
- `createCreditCard(formData)` — now handles all three types, validates dueDay only for credit
- `getCreditCards()` — returns all types, rename export to `getPaymentMethods()` (keep old name as alias)
- `deleteCreditCard(id)` — unchanged

## 3. Bills Form — "Pay With" Field

Move payment method picker from "subscription only" to **all bill types**.

- Label: "Pay with (optional)"
- Dropdown: "None" + all user payment methods (name + type badge)
- Field name: `paymentMethodId` (maps to `creditCardId` column — same FK, no schema change needed)

## 4. Expenses Form — Replace Hard-coded Picker

Current: `"cash" | "debit" | "credit_card"` hard-coded radio/select.

New: dropdown of user's saved payment methods + a built-in **Cash** option.

```ts
// Built-in option (no DB row):
{ id: "cash", name: "Cash", type: "cash" }

// Then all user payment methods from DB
```

The `expenses.paymentMethod` column currently stores `"cash" | "debit" | "credit_card"`. Extend to also store the payment method ID for saved methods:

```ts
// New column on expenses:
paymentMethodId: integer("payment_method_id").references(() => creditCards.id, { onDelete: "set null" }),
```

Keep `paymentMethod` column for backward compat but populate it from the selected method's type when saving:
- Cash → `"cash"`
- Debit / ATH Móvil → `"debit"`  
- Credit → `"credit_card"`

## 5. Trends — Payment Method Breakdown

On `/trends` page, add a "By Payment Method" section showing:
- Total spent per payment method (name + amount + % of total)
- Ordered by amount desc
- Only shows methods with at least one expense in the selected month

Server action: `getExpensesByPaymentMethod(monthId)` — groups expenses by `paymentMethodId` (or `paymentMethod` for cash).

## 6. Updated Server Actions

- `lib/actions/credit-cards.ts` → rename file to `lib/actions/payment-methods.ts`, keep old exports as re-exports for backward compat
- Add `getPaymentMethods()` (replaces `getCreditCards()`)
- Update `createCreditCard` → `createPaymentMethod` with new type + nullable dueDay logic
- Update `deletePaymentMethod` (same as deleteCreditCard)
