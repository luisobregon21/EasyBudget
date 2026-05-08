"use server";
import { getDb, bills } from "@/lib/db";
import { and, eq, asc } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";

export async function getUserBills() {
  const user = await requireSession();
  const db = getDb();
  return db.select().from(bills)
    .where(and(eq(bills.userId, user.id!), eq(bills.active, true)))
    .orderBy(asc(bills.dueDay));
}

export async function getUpcomingBills(daysAhead = 7) {
  const user = await requireSession();
  const db = getDb();
  const today = new Date().getDate();
  const allBills = await db.select().from(bills)
    .where(and(eq(bills.userId, user.id!), eq(bills.active, true)));
  return allBills.filter((b) => {
    const daysUntil = b.dueDay >= today ? b.dueDay - today : 31 - today + b.dueDay;
    return daysUntil <= daysAhead;
  });
}

export async function createBill(formData: FormData) {
  const user = await requireSession();
  const db = getDb();
  await db.insert(bills).values({
    userId:             user.id!,
    name:               formData.get("name") as string,
    amount:             parseFloat(formData.get("amount") as string),
    dueDay:             parseInt(formData.get("dueDay") as string),
    type:               formData.get("type") as "utility" | "subscription" | "credit_card" | "loan" | "other",
    reminderDaysBefore: parseInt((formData.get("reminderDaysBefore") as string) || "3"),
  });
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
