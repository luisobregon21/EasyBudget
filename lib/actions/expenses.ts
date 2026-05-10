"use server";
import { getDb, expenses, tags, trips, months, creditCards, bills } from "@/lib/db";
import { and, eq, desc } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { convertToUsd } from "@/lib/exchange-rate";

export async function getExpensesForMonth(monthId: number) {
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
  .orderBy(desc(expenses.date));
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
  const paymentMethodIdStr = formData.get("paymentMethodId") as string;
  const paymentMethodId  = (!paymentMethodIdStr || paymentMethodIdStr === "cash")
    ? null
    : parseInt(paymentMethodIdStr);

  await db.insert(expenses).values({
    userId:          user.id!,
    monthId:         monthRow.id,
    amount,
    currency,
    amountUsd,
    exchangeRate:    rate,
    description:     (formData.get("description") as string) || "",
    date:            (formData.get("date") as string) || new Date().toISOString().split("T")[0],
    paymentMethod:   (formData.get("paymentMethod") as "cash" | "debit" | "credit_card") || "debit",
    paymentMethodId,
    bucket:          (formData.get("bucket") as "savings" | "bills" | "wants") || "wants",
    tagId:           tagIdStr  ? parseInt(tagIdStr)  : null,
    tripId:          tripIdStr ? parseInt(tripIdStr) : null,
  });

  revalidatePath("/");
  revalidatePath("/expenses");
  return { success: true, message: "Expense saved." };
}

export async function deleteExpense(expenseId: number): Promise<{ success: boolean; message: string }> {
  const user = await requireSession();
  const db = getDb();
  await db.delete(expenses).where(and(eq(expenses.id, expenseId), eq(expenses.userId, user.id!)));
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

  const currency = (formData.get("currency") as string) || "USD";
  const amount   = parseFloat(formData.get("amount") as string);
  const { amountUsd, rate } = await convertToUsd(amount, currency);

  const tagIdStr           = formData.get("tagId") as string;
  const tripIdStr          = formData.get("tripId") as string;
  const paymentMethodIdStr = formData.get("paymentMethodId") as string;
  const paymentMethodId    = (!paymentMethodIdStr || paymentMethodIdStr === "cash")
    ? null
    : parseInt(paymentMethodIdStr);

  await db.update(expenses).set({
    amount,
    currency,
    amountUsd,
    exchangeRate:    rate,
    description:     (formData.get("description") as string) || "",
    date:            (formData.get("date") as string) || new Date().toISOString().split("T")[0],
    paymentMethod:   (formData.get("paymentMethod") as "cash" | "debit" | "credit_card") || "debit",
    paymentMethodId,
    bucket:          (formData.get("bucket") as "savings" | "bills" | "wants") || "wants",
    tagId:           tagIdStr  ? parseInt(tagIdStr)  : null,
    tripId:          tripIdStr ? parseInt(tripIdStr) : null,
  }).where(and(eq(expenses.id, expenseId), eq(expenses.userId, user.id!)));

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
