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
    const dueDay = parseInt(formData.get("dueDay") as string);
    if (!name || isNaN(dueDay) || dueDay < 1 || dueDay > 31) throw new Error("Invalid card data");
    await db.insert(creditCards).values({ userId: user.id!, name, dueDay });
    revalidatePath("/settings");
    return { success: true, message: "Card saved" };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Failed to save card" };
  }
}

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
