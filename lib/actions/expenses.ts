"use server";
import { getDb, expenses, tags, trips, months, creditCards, bills, billPayments } from "@/lib/db";
import { and, eq, desc } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { convertToUsd } from "@/lib/exchange-rate";

type Bucket = "savings" | "bills" | "wants";

export async function getExpensesForMonth(monthId: number, bucket?: Bucket) {
  const user = await requireSession();
  const db = getDb();
  const conditions = [eq(expenses.monthId, monthId), eq(expenses.userId, user.id!)];
  if (bucket) conditions.push(eq(expenses.bucket, bucket));
  return db.select({
    id:            expenses.id,
    amount:        expenses.amount,
    currency:      expenses.currency,
    amountUsd:     expenses.amountUsd,
    description:   expenses.description,
    date:          expenses.date,
    paymentMethod: expenses.paymentMethod,
    bucket:        expenses.bucket,
    tagName:       tags.name,
    tagEmoji:      tags.emoji,
    tripName:      trips.name,
  })
  .from(expenses)
  .leftJoin(tags,  eq(expenses.tagId,  tags.id))
  .leftJoin(trips, eq(expenses.tripId, trips.id))
  .where(and(...conditions))
  .orderBy(desc(expenses.date));
}

export async function getRecentExpenses(monthId: number, limit = 6) {
  const user = await requireSession();
  const db = getDb();
  return db.select({
    id:            expenses.id,
    amount:        expenses.amount,
    currency:      expenses.currency,
    amountUsd:     expenses.amountUsd,
    description:   expenses.description,
    date:          expenses.date,
    paymentMethod: expenses.paymentMethod,
    bucket:        expenses.bucket,
    tagName:       tags.name,
    tagEmoji:      tags.emoji,
    tripName:      trips.name,
  })
  .from(expenses)
  .leftJoin(tags,  eq(expenses.tagId,  tags.id))
  .leftJoin(trips, eq(expenses.tripId, trips.id))
  .where(and(eq(expenses.monthId, monthId), eq(expenses.userId, user.id!)))
  .orderBy(desc(expenses.date))
  .limit(limit);
}

/**
 * Idempotent bill_payment upsert. Called whenever an expense is linked to a bill
 * to keep the Bills "Paid" status in sync with the Expenses ledger.
 *
 * Returns true if a new bill_payment row was created (i.e., the bill was
 * previously unpaid for this month).
 */
async function ensureBillPaidForMonth(args: {
  userId: string;
  billId: number;
  monthId: number;
  amount: number;
  dateStr: string;
}): Promise<boolean> {
  const db = getDb();
  const [existing] = await db.select({ id: billPayments.id }).from(billPayments)
    .where(and(
      eq(billPayments.userId, args.userId),
      eq(billPayments.billId, args.billId),
      eq(billPayments.monthId, args.monthId),
    ))
    .limit(1);
  if (existing) return false;

  const [bill] = await db.select({ dueDay: bills.dueDay }).from(bills)
    .where(and(eq(bills.id, args.billId), eq(bills.userId, args.userId)))
    .limit(1);
  if (!bill) return false;

  const payDay = parseInt(args.dateStr.split("-")[2], 10);
  const paidLate = payDay > bill.dueDay;

  await db.insert(billPayments).values({
    userId: args.userId,
    billId: args.billId,
    monthId: args.monthId,
    amount: args.amount,
    date: args.dateStr,
    paidLate,
    note: null,
  });
  return true;
}

/** Remove the bill_payment for (billId, monthId) if present — used when an expense link is removed. */
async function clearBillPaidForMonth(userId: string, billId: number, monthId: number) {
  const db = getDb();
  await db.delete(billPayments).where(and(
    eq(billPayments.userId, userId),
    eq(billPayments.billId, billId),
    eq(billPayments.monthId, monthId),
  ));
}

export async function createExpense(prevState: unknown, formData: FormData): Promise<{ success: boolean; message: string }> {
  const user = await requireSession();
  const db = getDb();

  const year  = parseInt(formData.get("year")  as string);
  const month = parseInt(formData.get("month") as string);

  // Get or create the month record
  let [monthRow] = await db.select().from(months)
    .where(and(eq(months.userId, user.id!), eq(months.year, year), eq(months.month, month)))
    .limit(1);

  if (!monthRow) {
    [monthRow] = await db.insert(months).values({ userId: user.id!, year, month }).returning();
  }

  const currency = (formData.get("currency") as string) || "USD";
  const amount   = parseFloat(formData.get("amount") as string);
  const { amountUsd, rate } = await convertToUsd(amount, currency);

  const tagIdStr         = formData.get("tagId")  as string;
  const tripIdStr        = formData.get("tripId") as string;
  const billIdStr        = formData.get("billId") as string;
  const billId           = billIdStr && billIdStr !== "none" ? parseInt(billIdStr) : null;
  const paymentMethodIdStr = formData.get("paymentMethodId") as string;
  const paymentMethodId  = (!paymentMethodIdStr || paymentMethodIdStr === "cash")
    ? null
    : parseInt(paymentMethodIdStr);

  const dateStr = (formData.get("date") as string) || new Date().toISOString().split("T")[0];

  await db.insert(expenses).values({
    userId:          user.id!,
    monthId:         monthRow.id,
    amount,
    currency,
    amountUsd,
    exchangeRate:    rate,
    description:     (formData.get("description") as string) || "",
    date:            dateStr,
    paymentMethod:   (formData.get("paymentMethod") as "cash" | "debit" | "credit_card") || "debit",
    paymentMethodId,
    bucket:          (formData.get("bucket") as "savings" | "bills" | "wants") || "wants",
    tagId:           tagIdStr  ? parseInt(tagIdStr)  : null,
    tripId:          tripIdStr && tripIdStr !== "none" ? parseInt(tripIdStr) : null,
    billId,
  });

  // If the expense is tied to a bill, mark the bill paid for that month (idempotent).
  let billMessage = "";
  if (billId) {
    const created = await ensureBillPaidForMonth({
      userId: user.id!,
      billId,
      monthId: monthRow.id,
      amount: amountUsd,
      dateStr,
    });
    if (created) {
      billMessage = " · bill marked paid";
      revalidatePath("/bills");
    }
  }

  revalidatePath("/");
  revalidatePath("/expenses");
  return { success: true, message: `Expense saved.${billMessage}` };
}

export async function deleteExpense(expenseId: number): Promise<{ success: boolean; message: string }> {
  const user = await requireSession();
  const db = getDb();

  // Capture the bill linkage (if any) so we can roll back the bill_payment.
  const [existing] = await db.select({ billId: expenses.billId, monthId: expenses.monthId })
    .from(expenses)
    .where(and(eq(expenses.id, expenseId), eq(expenses.userId, user.id!)))
    .limit(1);

  await db.delete(expenses).where(and(eq(expenses.id, expenseId), eq(expenses.userId, user.id!)));

  if (existing?.billId) {
    await clearBillPaidForMonth(user.id!, existing.billId, existing.monthId);
    revalidatePath("/bills");
  }

  revalidatePath("/");
  revalidatePath("/expenses");
  return { success: true, message: "Expense deleted." };
}

export async function getExpense(expenseId: number) {
  const user = await requireSession();
  const db = getDb();
  const [row] = await db.select().from(expenses)
    .where(and(eq(expenses.id, expenseId), eq(expenses.userId, user.id!)))
    .limit(1);
  return row ?? null;
}

export async function updateExpense(expenseId: number, formData: FormData) {
  const user = await requireSession();
  const db = getDb();

  // Read prior bill linkage so we can reconcile if it changed.
  const [prior] = await db.select({ billId: expenses.billId, monthId: expenses.monthId })
    .from(expenses)
    .where(and(eq(expenses.id, expenseId), eq(expenses.userId, user.id!)))
    .limit(1);

  const currency = (formData.get("currency") as string) || "USD";
  const amount   = parseFloat(formData.get("amount") as string);
  const { amountUsd, rate } = await convertToUsd(amount, currency);

  const tagIdStr           = formData.get("tagId") as string;
  const tripIdStr          = formData.get("tripId") as string;
  const billIdStr          = formData.get("billId") as string;
  const billId             = billIdStr && billIdStr !== "none" ? parseInt(billIdStr) : null;
  const paymentMethodIdStr = formData.get("paymentMethodId") as string;
  const paymentMethodId    = (!paymentMethodIdStr || paymentMethodIdStr === "cash")
    ? null
    : parseInt(paymentMethodIdStr);

  const dateStr = (formData.get("date") as string) || new Date().toISOString().split("T")[0];

  await db.update(expenses).set({
    amount,
    currency,
    amountUsd,
    exchangeRate:    rate,
    description:     (formData.get("description") as string) || "",
    date:            dateStr,
    paymentMethod:   (formData.get("paymentMethod") as "cash" | "debit" | "credit_card") || "debit",
    paymentMethodId,
    bucket:          (formData.get("bucket") as "savings" | "bills" | "wants") || "wants",
    tagId:           tagIdStr  ? parseInt(tagIdStr)  : null,
    tripId:          tripIdStr && tripIdStr !== "none" ? parseInt(tripIdStr) : null,
    billId,
  }).where(and(eq(expenses.id, expenseId), eq(expenses.userId, user.id!)));

  // Reconcile bill_payment with the new linkage:
  // - If linkage was removed (prior had billId, now null), clear the bill_payment.
  // - If linkage was added or swapped to a different bill, ensure new bill_payment exists.
  if (prior?.billId && prior.billId !== billId) {
    await clearBillPaidForMonth(user.id!, prior.billId, prior.monthId);
    revalidatePath("/bills");
  }
  if (billId && prior?.monthId) {
    const created = await ensureBillPaidForMonth({
      userId: user.id!,
      billId,
      monthId: prior.monthId,
      amount: amountUsd,
      dateStr,
    });
    if (created) revalidatePath("/bills");
  }

  revalidatePath("/");
  revalidatePath("/expenses");
  redirect("/expenses");
}

export async function logBillPayment(billId: number): Promise<{ success: boolean; message: string }> {
  const user = await requireSession();
  const db = getDb();

  const [bill] = await db.select({
    id:           bills.id,
    name:         bills.name,
    amount:       bills.amount,
    creditCardId: bills.creditCardId,
    type:         bills.type,
  }).from(bills).where(and(eq(bills.id, billId), eq(bills.userId, user.id!))).limit(1);

  if (!bill) return { success: false, message: "Bill not found." };

  const today = new Date();
  const year  = today.getFullYear();
  const month = today.getMonth() + 1;
  const dateStr = today.toISOString().split("T")[0];

  let [monthRow] = await db.select().from(months)
    .where(and(eq(months.userId, user.id!), eq(months.year, year), eq(months.month, month)))
    .limit(1);
  if (!monthRow) {
    [monthRow] = await db.insert(months).values({ userId: user.id!, year, month }).returning();
  }

  // Determine payment method from linked card
  let paymentMethod: "cash" | "debit" | "credit_card" = "debit";
  let paymentMethodId: number | null = null;
  if (bill.creditCardId) {
    const [card] = await db.select().from(creditCards).where(eq(creditCards.id, bill.creditCardId)).limit(1);
    if (card) {
      paymentMethodId = card.id;
      paymentMethod = card.type === "credit" ? "credit_card" : "debit";
    }
  }

  await db.insert(expenses).values({
    userId:        user.id!,
    monthId:       monthRow.id,
    amount:        bill.amount,
    currency:      "USD",
    amountUsd:     bill.amount,
    exchangeRate:  1,
    description:   bill.name,
    date:          dateStr,
    paymentMethod,
    paymentMethodId,
    bucket:        "bills",
    tagId:         null,
    tripId:        null,
  });

  revalidatePath("/bills");
  revalidatePath("/");
  return { success: true, message: `${bill.name} logged as paid.` };
}

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

  const groups: Record<string, { name: string; total: number }> = {};
  for (const row of rows) {
    const key = row.paymentMethodId ? String(row.paymentMethodId) : "cash";
    const name = row.methodName ?? (
      row.paymentMethod === "cash" ? "Cash" :
      row.paymentMethod === "credit_card" ? "Credit Card" : "Debit Card"
    );
    if (!groups[key]) groups[key] = { name, total: 0 };
    groups[key].total += row.amountUsd;
  }

  return Object.entries(groups)
    .filter(([, g]) => g.total > 0)
    .sort(([, a], [, b]) => b.total - a.total)
    .map(([key, g]) => ({ key, ...g }));
}
