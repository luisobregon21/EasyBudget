"use server";
import { getDb, expenses, tags, trips, months, creditCards } from "@/lib/db";
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

export async function createExpense(formData: FormData) {
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
  redirect("/");
}

export async function deleteExpense(expenseId: number) {
  const user = await requireSession();
  const db = getDb();
  await db.delete(expenses).where(and(eq(expenses.id, expenseId), eq(expenses.userId, user.id!)));
  revalidatePath("/");
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
