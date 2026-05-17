# Credit Card Payments — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** New `/payments` page that lets users pay down credit card balances. Payments are transfers between accounts, NOT expenses — they decrement the card balance without counting toward "spent this month".

**Architecture:** New `cardPayments` table. `/payments` page lists each credit card with its computed balance, recent activity, "Pay" and "Reconcile" actions. Balance is `SUM(card-expenses) − SUM(card-payments)` computed at read time.

**Tech Stack:** Next.js 16 · Drizzle · lucide-react · sonner

**Spec:** [docs/superpowers/specs/2026-05-12-credit-card-payments-design.md](docs/superpowers/specs/2026-05-12-credit-card-payments-design.md)

**Depends on:** Lucide migration ([2026-05-17-lucide-icon-migration.md](2026-05-17-lucide-icon-migration.md)) for `IconTile` + BILL_ICON.

**Verification:** `npx tsc --noEmit` after each task. `npx next build` + `dotenv -e .env.local -- npx drizzle-kit push` for schema.

---

## Task 1: Schema — `cardPayments` table

**Files:** Modify `lib/db/schema.ts`

- [ ] **Step 1: Add the table at the end**

```ts
export const cardPayments = pgTable("card_payments", {
  id:               serial("id").primaryKey(),
  userId:           text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  monthId:          integer("month_id").notNull().references(() => months.id, { onDelete: "cascade" }),
  creditCardId:     integer("credit_card_id").notNull().references(() => creditCards.id, { onDelete: "cascade" }),
  amount:           real("amount").notNull(),
  date:             date("date").notNull(),
  paidFromMethodId: integer("paid_from_method_id").references(() => creditCards.id, { onDelete: "set null" }),
  note:             text("note"),
  isAdjustment:     boolean("is_adjustment").notNull().default(false),
  createdAt:        timestamp("created_at").notNull().defaultNow(),
});
```

- [ ] **Step 2: Push schema**

```bash
npx dotenv -e .env.local -- npx drizzle-kit push
```

Expected: prompts to create the new table. Confirm.

- [ ] **Step 3: Commit**

```bash
git add lib/db/schema.ts
git commit -m "feat(db): cardPayments table (payments are transfers, not expenses)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Server actions — `lib/actions/card-payments.ts`

**Files:** Create `lib/actions/card-payments.ts`

- [ ] **Step 1: Add types + 4 actions**

```ts
"use server";
import { and, eq, sql, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb, cardPayments, creditCards, expenses, months } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { currentYearMonth } from "@/lib/utils";

export type CardWithBalance = {
  id: number;
  name: string;
  type: "credit" | "debit" | "ath_movil";
  dueDay: number | null;
  balance: number;
  thisMonthCharges: number;
  thisMonthPayments: number;
};

export type CardActivityRow = {
  id: number;
  kind: "expense" | "payment" | "adjustment";
  amount: number;        // signed: + = balance up; − = balance down
  date: string;
  description: string;
};

export async function getCreditCardsWithBalances(): Promise<CardWithBalance[]> {
  const user = await requireSession();
  const db = getDb();
  const userId = user.id!;
  const { year, month } = currentYearMonth();
  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const monthEnd   = `${year}-${String(month).padStart(2, "0")}-31`;

  const cards = await db.select().from(creditCards).where(eq(creditCards.userId, userId));

  // Aggregate expenses and payments per card in two queries
  const expRows = await db.select({
    cardId: expenses.paymentMethodId,
    total:  sql<number>`coalesce(sum(${expenses.amountUsd}), 0)`,
    thisMonth: sql<number>`coalesce(sum(case when ${expenses.date} between ${monthStart} and ${monthEnd} then ${expenses.amountUsd} else 0 end), 0)`,
  })
    .from(expenses)
    .where(and(eq(expenses.userId, userId), sql`${expenses.paymentMethodId} is not null`))
    .groupBy(expenses.paymentMethodId);

  const payRows = await db.select({
    cardId: cardPayments.creditCardId,
    total:  sql<number>`coalesce(sum(${cardPayments.amount}), 0)`,
    thisMonth: sql<number>`coalesce(sum(case when ${cardPayments.date} between ${monthStart} and ${monthEnd} then ${cardPayments.amount} else 0 end), 0)`,
  })
    .from(cardPayments)
    .where(eq(cardPayments.userId, userId))
    .groupBy(cardPayments.creditCardId);

  const expMap = new Map(expRows.map((r) => [r.cardId!, r]));
  const payMap = new Map(payRows.map((r) => [r.cardId, r]));

  return cards.map((c) => {
    const exp = expMap.get(c.id);
    const pay = payMap.get(c.id);
    const expTotal = Number(exp?.total ?? 0);
    const payTotal = Number(pay?.total ?? 0);
    return {
      id: c.id,
      name: c.name,
      type: c.type,
      dueDay: c.dueDay,
      balance: expTotal - payTotal,
      thisMonthCharges:  Number(exp?.thisMonth ?? 0),
      thisMonthPayments: Number(pay?.thisMonth ?? 0),
    };
  });
}

export async function getCardActivity(cardId: number, limit = 20): Promise<CardActivityRow[]> {
  const user = await requireSession();
  const db = getDb();
  const userId = user.id!;

  // Fetch expenses on this card + payments for this card, merge, sort by date desc
  const [exp, pay] = await Promise.all([
    db.select({
      id:          expenses.id,
      amount:      expenses.amountUsd,
      date:        expenses.date,
      description: expenses.description,
    })
      .from(expenses)
      .where(and(eq(expenses.userId, userId), eq(expenses.paymentMethodId, cardId)))
      .orderBy(desc(expenses.date))
      .limit(limit),
    db.select({
      id:           cardPayments.id,
      amount:       cardPayments.amount,
      date:         cardPayments.date,
      note:         cardPayments.note,
      isAdjustment: cardPayments.isAdjustment,
      paidFromId:   cardPayments.paidFromMethodId,
    })
      .from(cardPayments)
      .where(and(eq(cardPayments.userId, userId), eq(cardPayments.creditCardId, cardId)))
      .orderBy(desc(cardPayments.date))
      .limit(limit),
  ]);

  const rows: CardActivityRow[] = [
    ...exp.map((e) => ({
      id:          e.id,
      kind:        "expense" as const,
      amount:      e.amount,
      date:        e.date,
      description: e.description || "Charge",
    })),
    ...pay.map((p) => ({
      id:          p.id,
      kind:        p.isAdjustment ? ("adjustment" as const) : ("payment" as const),
      amount:      -p.amount, // payments decrement balance
      date:        p.date,
      description: p.note || (p.isAdjustment ? "Balance adjustment" : "Payment"),
    })),
  ];

  return rows.sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
}

export async function createCardPayment(
  prevState: unknown,
  formData: FormData,
): Promise<{ success: boolean; message: string }> {
  const user = await requireSession();
  const db = getDb();
  try {
    const creditCardId = Number(formData.get("creditCardId"));
    const amount = parseFloat(String(formData.get("amount") ?? "0"));
    const date = String(formData.get("date") ?? "");
    const paidFrom = formData.get("paidFromMethodId");
    const note = (formData.get("note") as string) || null;
    if (!creditCardId || !amount || amount <= 0 || !date) {
      return { success: false, message: "Card, amount, and date required." };
    }
    // Locate or create the month row for this date
    const [year, month] = date.split("-").map(Number);
    let [m] = await db.select().from(months).where(and(eq(months.userId, user.id!), eq(months.year, year), eq(months.month, month))).limit(1);
    if (!m) {
      [m] = await db.insert(months).values({ userId: user.id!, year, month }).returning();
    }
    await db.insert(cardPayments).values({
      userId: user.id!,
      monthId: m.id,
      creditCardId,
      amount,
      date,
      paidFromMethodId: paidFrom === "cash" || !paidFrom ? null : Number(paidFrom),
      note,
      isAdjustment: false,
    });
    revalidatePath("/payments");
    revalidatePath("/");
    return { success: true, message: "Payment recorded." };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : "Failed to record payment." };
  }
}

export async function reconcileCardBalance(
  cardId: number,
  statementBalance: number,
): Promise<{ success: boolean; message: string }> {
  const user = await requireSession();
  const db = getDb();
  const userId = user.id!;
  try {
    const cards = await getCreditCardsWithBalances();
    const card = cards.find((c) => c.id === cardId);
    if (!card) return { success: false, message: "Card not found." };
    const diff = statementBalance - card.balance;
    if (Math.abs(diff) < 0.01) return { success: true, message: "Balance already matches." };

    const today = new Date().toISOString().slice(0, 10);
    const [year, month] = today.split("-").map(Number);
    let [m] = await db.select().from(months).where(and(eq(months.userId, userId), eq(months.year, year), eq(months.month, month))).limit(1);
    if (!m) {
      [m] = await db.insert(months).values({ userId, year, month }).returning();
    }
    // amount stored to bring balance to statementBalance: payment amount = -diff
    await db.insert(cardPayments).values({
      userId,
      monthId: m.id,
      creditCardId: cardId,
      amount: -diff,
      date: today,
      paidFromMethodId: null,
      note: "Adjustment to reconcile",
      isAdjustment: true,
    });
    revalidatePath("/payments");
    return { success: true, message: "Balance reconciled." };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : "Failed to reconcile." };
  }
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
npx tsc --noEmit
git add lib/actions/card-payments.ts
git commit -m "feat(actions): card-payments — balance computation, activity, pay, reconcile

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Components

### Task 3.1: `components/payments/card-section.tsx` (server)

One credit card's section: glow card with name + dueDay + balance + this-month chip + `Pay` and `Reconcile` buttons + activity list.

Renders 8 most recent activity rows; each row uses `<IconTile>` with `ArrowUpRight` (charge, red tone) or `ArrowDownRight` (payment/adjustment, green tone).

Commit: `feat(payments): CardSection`

### Task 3.2: `components/payments/pay-card-sheet.tsx` (client)

Slide-up form. Fields: amount (big gradient input), paid-from (Cash + each other card as pill buttons), date, note. Uses `useActionState(createCardPayment, ...)`.

Commit: `feat(payments): PayCardSheet`

### Task 3.3: `components/payments/reconcile-form.tsx` (client)

Smaller sheet. Single statement-balance number input. Live-shows "Adjustment: +/− $X (balance up/down)". Submit button → `reconcileCardBalance(cardId, parseFloat(balance))`.

Commit: `feat(payments): ReconcileForm`

---

## Task 4: Page — `app/(app)/payments/page.tsx`

Server component. Fetches `getCreditCardsWithBalances()` + per-card activity in parallel. Renders `<CardSection>` for each `type === "credit"` card. Empty state with link to `/settings` if no credit cards.

Sheets controlled by client state in a top-level client wrapper (or pass card ids via URL like `?pay=<id>`).

Commit: `feat(payments): /payments page`

---

## Task 5: Nav integration

### Task 5.1: Sidebar (desktop)

Add `Payments` link in the "More" section (between header divider and Tags). Spec already calls this out.

Commit: `chore(layout): sidebar adds Payments link in More section`

### Task 5.2: More sheet (mobile)

Add `Payments` as the first item in the More sheet list.

Commit: `chore(layout): more sheet adds Payments`

---

## Task 6: Production build + smoke

- [ ] **Step 1:** `npx tsc --noEmit` (zero output)
- [ ] **Step 2:** `npx next build` (`/payments` listed as `ƒ`)
- [ ] **Step 3:** Manual smoke test:
  - `/payments` lists each credit card with balance
  - Pay → fill out form → submit → balance decreases, activity row appears
  - Reconcile → enter statement balance → adjustment shows in activity, balance updates
  - Cash payment (no paid-from card) works
  - Reconcile when balance already matches → "already matches" toast, no row inserted

---

## Self-review

- Payments are NOT expenses: total `spent` on Overview / Trends does not change after recording a payment
- Card balance updates immediately after pay / reconcile (revalidatePath fires)
- Adjustments are flagged `isAdjustment: true` and label as "adjustment" in activity
- Paying from another card decrements payer card balance (it's still an expense from that card's POV — confirm via spec; if not, the from-card side is not modeled in V1)
- Drizzle push committed schema; no migration drift
