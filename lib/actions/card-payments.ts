"use server";
import { and, eq, sql, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { put, del } from "@vercel/blob";
import { getDb, cardPayments, creditCards, expenses, months } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { currentYearMonth, roundMoney } from "@/lib/utils";
import { utilizationBandFor } from "@/lib/credit-utilization";
import type { UtilizationBand } from "@/lib/credit-utilization";

export type CardWithBalance = {
  id: number;
  name: string;
  type: "credit" | "debit" | "ath_movil";
  dueDay: number | null;
  creditLimit: number | null;
  balance: number;
  thisMonthCharges: number;
  thisMonthPayments: number;
  /** balance / creditLimit * 100, rounded. Null when limit is unset or non-credit. */
  utilizationPct: number | null;
  utilizationBand: UtilizationBand | null;
};

export type CardActivityRow = {
  id: number;
  kind: "expense" | "payment" | "adjustment";
  amount: number;        // signed: + = balance up; − = balance down
  date: string;
  description: string;
  /** payment rows only: days vs the card's dueDay for that month (− = early, + = late) */
  daysOffset?: number;
  /** payment rows only: receipt image URL + pathname (private Blob, served via /api/receipts) */
  receiptUrl?: string | null;
  receiptPathname?: string | null;
};

export async function getCreditCardsWithBalances(): Promise<CardWithBalance[]> {
  const user = await requireSession();
  const db = getDb();
  const userId = user.id!;
  const { year, month } = currentYearMonth();
  // Last day varies by month (28/29/30/31). Day 0 of next month = last day of current month.
  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay    = new Date(year, month, 0).getDate();
  const monthEnd   = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

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
    const balance = roundMoney(expTotal - payTotal);

    const showsUtilization = c.type === "credit" && c.creditLimit != null && c.creditLimit > 0;
    const utilizationPct = showsUtilization
      ? Math.max(0, Math.round((balance / (c.creditLimit as number)) * 100))
      : null;
    const utilizationBand = utilizationPct != null ? utilizationBandFor(utilizationPct) : null;

    return {
      id: c.id,
      name: c.name,
      type: c.type,
      dueDay: c.dueDay,
      creditLimit: c.creditLimit,
      balance,
      thisMonthCharges:  roundMoney(Number(exp?.thisMonth ?? 0)),
      thisMonthPayments: roundMoney(Number(pay?.thisMonth ?? 0)),
      utilizationPct,
      utilizationBand,
    };
  });
}

export async function getCardActivity(cardId: number, limit = 20): Promise<CardActivityRow[]> {
  const user = await requireSession();
  const db = getDb();
  const userId = user.id!;

  // Fetch card (for dueDay), expenses on this card + payments for this card
  const [[card], exp, pay] = await Promise.all([
    db.select({ dueDay: creditCards.dueDay })
      .from(creditCards)
      .where(and(eq(creditCards.id, cardId), eq(creditCards.userId, userId)))
      .limit(1),
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
      id:              cardPayments.id,
      amount:          cardPayments.amount,
      date:            cardPayments.date,
      note:            cardPayments.note,
      isAdjustment:    cardPayments.isAdjustment,
      paidFromId:      cardPayments.paidFromMethodId,
      receiptUrl:      cardPayments.receiptUrl,
      receiptPathname: cardPayments.receiptPathname,
    })
      .from(cardPayments)
      .where(and(eq(cardPayments.userId, userId), eq(cardPayments.creditCardId, cardId)))
      .orderBy(desc(cardPayments.date))
      .limit(limit),
  ]);

  const dueDay = card?.dueDay ?? null;

  const rows: CardActivityRow[] = [
    ...exp.map((e) => ({
      id:          e.id,
      kind:        "expense" as const,
      amount:      roundMoney(e.amount),
      date:        e.date,
      description: e.description || "Charge",
    })),
    ...pay.map((p) => {
      const isAdj = p.isAdjustment;
      let daysOffset: number | undefined;
      if (!isAdj && dueDay != null) {
        const payDay = parseInt(p.date.split("-")[2], 10);
        daysOffset = payDay - dueDay;
      }
      return {
        id:              p.id,
        kind:            (isAdj ? "adjustment" : "payment") as "adjustment" | "payment",
        amount:          roundMoney(-p.amount), // payments decrement balance
        date:            p.date,
        description:     p.note || (isAdj ? "Balance adjustment" : "Payment"),
        daysOffset,
        receiptUrl:      p.receiptUrl,
        receiptPathname: p.receiptPathname,
      };
    }),
  ];

  return rows.sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
}

async function uploadReceipt(
  userId: string,
  cardId: number,
  file: File,
): Promise<{ url: string; pathname: string }> {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const pathname = `receipts/${userId}/${cardId}/${Date.now()}.${ext}`;
  const blob = await put(pathname, file, {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: false,
    contentType: file.type || undefined,
  });
  return { url: blob.url, pathname: blob.pathname };
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
    const receiptFile = formData.get("receipt");
    if (!creditCardId || !amount || amount <= 0 || !date) {
      return { success: false, message: "Card, amount, and date required." };
    }

    // Optional receipt upload first — if it fails, abort before DB insert
    let receiptUrl: string | null = null;
    let receiptPathname: string | null = null;
    if (receiptFile instanceof File && receiptFile.size > 0) {
      const up = await uploadReceipt(user.id!, creditCardId, receiptFile);
      receiptUrl = up.url;
      receiptPathname = up.pathname;
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
      receiptUrl,
      receiptPathname,
      isAdjustment: false,
    });
    revalidatePath("/payments");
    revalidatePath("/");
    return { success: true, message: "Payment recorded." };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : "Failed to record payment." };
  }
}

export async function updateCardPayment(
  paymentId: number,
  prevState: unknown,
  formData: FormData,
): Promise<{ success: boolean; message: string }> {
  const user = await requireSession();
  const db = getDb();
  const userId = user.id!;
  try {
    const [existing] = await db.select().from(cardPayments)
      .where(and(eq(cardPayments.id, paymentId), eq(cardPayments.userId, userId)))
      .limit(1);
    if (!existing) return { success: false, message: "Payment not found." };

    const amount = parseFloat(String(formData.get("amount") ?? existing.amount));
    const date = String(formData.get("date") ?? existing.date);
    const note = (formData.get("note") as string) ?? existing.note;
    const removeReceipt = formData.get("removeReceipt") === "1";
    const receiptFile = formData.get("receipt");

    if (!amount || amount <= 0 || !date) {
      return { success: false, message: "Amount and date required." };
    }

    let receiptUrl = existing.receiptUrl;
    let receiptPathname = existing.receiptPathname;

    // Replace or remove receipt
    if (removeReceipt && existing.receiptPathname) {
      await del(existing.receiptPathname).catch(() => {}); // best-effort
      receiptUrl = null;
      receiptPathname = null;
    }
    if (receiptFile instanceof File && receiptFile.size > 0) {
      if (existing.receiptPathname) {
        await del(existing.receiptPathname).catch(() => {});
      }
      const up = await uploadReceipt(userId, existing.creditCardId, receiptFile);
      receiptUrl = up.url;
      receiptPathname = up.pathname;
    }

    await db.update(cardPayments)
      .set({ amount, date, note: note ? String(note).trim() || null : null, receiptUrl, receiptPathname })
      .where(and(eq(cardPayments.id, paymentId), eq(cardPayments.userId, userId)));

    revalidatePath("/payments");
    return { success: true, message: "Payment updated." };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : "Failed to update payment." };
  }
}

export async function addReceiptToCardPayment(
  paymentId: number,
  prevState: unknown,
  formData: FormData,
): Promise<{ success: boolean; message: string }> {
  const user = await requireSession();
  const db = getDb();
  const userId = user.id!;
  try {
    const [existing] = await db.select().from(cardPayments)
      .where(and(eq(cardPayments.id, paymentId), eq(cardPayments.userId, userId)))
      .limit(1);
    if (!existing) return { success: false, message: "Payment not found." };

    const receiptFile = formData.get("receipt");
    if (!(receiptFile instanceof File) || receiptFile.size === 0) {
      return { success: false, message: "No file provided." };
    }
    if (existing.receiptPathname) {
      await del(existing.receiptPathname).catch(() => {});
    }
    const up = await uploadReceipt(userId, existing.creditCardId, receiptFile);
    await db.update(cardPayments)
      .set({ receiptUrl: up.url, receiptPathname: up.pathname })
      .where(and(eq(cardPayments.id, paymentId), eq(cardPayments.userId, userId)));

    revalidatePath("/payments");
    return { success: true, message: "Receipt added." };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : "Failed to add receipt." };
  }
}

export async function deleteCardPayment(paymentId: number): Promise<{ success: boolean; message: string }> {
  const user = await requireSession();
  const db = getDb();
  const userId = user.id!;
  try {
    const [existing] = await db.select().from(cardPayments)
      .where(and(eq(cardPayments.id, paymentId), eq(cardPayments.userId, userId)))
      .limit(1);
    if (!existing) return { success: false, message: "Payment not found." };
    if (existing.receiptPathname) {
      await del(existing.receiptPathname).catch(() => {});
    }
    await db.delete(cardPayments).where(and(eq(cardPayments.id, paymentId), eq(cardPayments.userId, userId)));
    revalidatePath("/payments");
    return { success: true, message: "Payment removed." };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : "Failed to remove payment." };
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
