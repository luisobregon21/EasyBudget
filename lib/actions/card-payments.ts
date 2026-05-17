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
