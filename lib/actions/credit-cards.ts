"use server";
import { getDb, creditCards } from "@/lib/db";
import { and, eq, asc } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";

export async function getCreditCards() {
  const user = await requireSession();
  const db = getDb();
  return db.select().from(creditCards)
    .where(eq(creditCards.userId, user.id!))
    .orderBy(asc(creditCards.name));
}

export async function createCreditCard(prevState: unknown, formData: FormData): Promise<{ success: boolean; message: string }> {
  try {
    const user = await requireSession();
    const db = getDb();
    const name = (formData.get("name") as string).trim();
    const type = (formData.get("type") as string) as "credit" | "debit" | "ath_movil";
    const dueDayStr = formData.get("dueDay") as string;
    const dueDay = dueDayStr ? parseInt(dueDayStr) : null;

    if (!name) throw new Error("Name is required");
    if (!["credit", "debit", "ath_movil"].includes(type)) throw new Error("Invalid type");
    if (type === "credit" && (!dueDay || dueDay < 1 || dueDay > 31)) throw new Error("Due day is required for credit cards");

    await db.insert(creditCards).values({ userId: user.id!, name, type, dueDay });
    revalidatePath("/settings");
    return { success: true, message: "Payment method saved" };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Failed to save payment method" };
  }
}

export const getPaymentMethods = getCreditCards;

export async function deleteCreditCard(cardId: number): Promise<{ success: boolean; message: string }> {
  try {
    const user = await requireSession();
    const db = getDb();
    await db.delete(creditCards)
      .where(and(eq(creditCards.id, cardId), eq(creditCards.userId, user.id!)));
    revalidatePath("/settings");
    return { success: true, message: "Card removed" };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Failed to remove card" };
  }
}
