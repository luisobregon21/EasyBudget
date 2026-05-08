"use server";
import { getDb, bills, creditCards } from "@/lib/db";
import { and, eq, asc } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";

export async function getUserBills() {
  const user = await requireSession();
  const db = getDb();
  const rows = await db
    .select({
      id: bills.id,
      name: bills.name,
      amount: bills.amount,
      dueDay: bills.dueDay,
      frequency: bills.frequency,
      renewalMonth: bills.renewalMonth,
      renewalDay: bills.renewalDay,
      description: bills.description,
      type: bills.type,
      creditCardId: bills.creditCardId,
      creditCardName: creditCards.name,
      reminderDaysBefore: bills.reminderDaysBefore,
      active: bills.active,
    })
    .from(bills)
    .leftJoin(creditCards, eq(bills.creditCardId, creditCards.id))
    .where(and(eq(bills.userId, user.id!), eq(bills.active, true)))
    .orderBy(asc(bills.frequency), asc(bills.renewalMonth), asc(bills.renewalDay), asc(bills.dueDay));
  return rows;
}

export async function getBillById(billId: number) {
  const user = await requireSession();
  const db = getDb();
  const rows = await db.select().from(bills)
    .where(and(eq(bills.id, billId), eq(bills.userId, user.id!)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getUpcomingBills(daysAhead = 7) {
  const user = await requireSession();
  const db = getDb();
  const today = new Date();
  const todayDay = today.getDate();
  const todayMonth = today.getMonth() + 1;

  const allBills = await db
    .select({
      id: bills.id,
      name: bills.name,
      amount: bills.amount,
      dueDay: bills.dueDay,
      frequency: bills.frequency,
      renewalMonth: bills.renewalMonth,
      renewalDay: bills.renewalDay,
      type: bills.type,
    })
    .from(bills)
    .where(and(eq(bills.userId, user.id!), eq(bills.active, true)));

  return allBills.filter((b) => {
    if (b.frequency === "yearly") {
      if (b.renewalMonth !== todayMonth) return false;
      const daysUntil = (b.renewalDay ?? 1) - todayDay;
      return daysUntil >= 0 && daysUntil <= daysAhead;
    }
    const daysUntil = b.dueDay >= todayDay
      ? b.dueDay - todayDay
      : 31 - todayDay + b.dueDay;
    return daysUntil <= daysAhead;
  });
}

function parseBillFormData(formData: FormData) {
  const frequency = formData.get("frequency") as "monthly" | "yearly";
  const type = formData.get("type") as "utility" | "subscription" | "credit_card" | "loan" | "other";
  const creditCardIdRaw = formData.get("creditCardId") as string;
  const creditCardId = creditCardIdRaw && creditCardIdRaw !== "none"
    ? parseInt(creditCardIdRaw)
    : null;

  return {
    name: (formData.get("name") as string).trim(),
    amount: parseFloat(formData.get("amount") as string),
    description: (formData.get("description") as string)?.trim() || null,
    frequency,
    dueDay: frequency === "monthly" ? parseInt(formData.get("dueDay") as string) : 1,
    renewalMonth: frequency === "yearly" ? parseInt(formData.get("renewalMonth") as string) : null,
    renewalDay: frequency === "yearly" ? parseInt(formData.get("renewalDay") as string) : null,
    type,
    creditCardId: type === "subscription" ? creditCardId : null,
    reminderDaysBefore: parseInt((formData.get("reminderDaysBefore") as string) || "3"),
  };
}

export async function createBill(formData: FormData) {
  const user = await requireSession();
  const db = getDb();
  await db.insert(bills).values({ userId: user.id!, ...parseBillFormData(formData) });
  revalidatePath("/bills");
  revalidatePath("/");
}

export async function updateBill(billId: number, formData: FormData) {
  const user = await requireSession();
  const db = getDb();
  await db.update(bills)
    .set(parseBillFormData(formData))
    .where(and(eq(bills.id, billId), eq(bills.userId, user.id!)));
  revalidatePath("/bills");
  revalidatePath("/");
}

export async function deleteBill(billId: number) {
  const user = await requireSession();
  const db = getDb();
  await db.update(bills).set({ active: false })
    .where(and(eq(bills.id, billId), eq(bills.userId, user.id!)));
  revalidatePath("/bills");
  revalidatePath("/");
}
