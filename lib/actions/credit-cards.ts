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

function parseLimit(raw: FormDataEntryValue | null): number | null {
  if (raw == null || raw === "") return null;
  const n = parseFloat(String(raw));
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export async function createCreditCard(prevState: unknown, formData: FormData): Promise<{ success: boolean; message: string }> {
  try {
    const user = await requireSession();
    const db = getDb();
    const name = (formData.get("name") as string).trim();
    const type = (formData.get("type") as string) as "credit" | "debit" | "ath_movil";
    const dueDayStr = formData.get("dueDay") as string;
    const dueDay = dueDayStr ? parseInt(dueDayStr) : null;
    const creditLimit = type === "credit" ? parseLimit(formData.get("creditLimit")) : null;

    if (!name) throw new Error("Name is required");
    if (!["credit", "debit", "ath_movil"].includes(type)) throw new Error("Invalid type");
    if (type === "credit" && (!dueDay || dueDay < 1 || dueDay > 31)) throw new Error("Due day is required for credit cards");

    await db.insert(creditCards).values({ userId: user.id!, name, type, dueDay, creditLimit });
    revalidatePath("/settings");
    revalidatePath("/payments");
    return { success: true, message: "Payment method saved" };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Failed to save payment method" };
  }
}

export async function updateCreditCard(
  cardId: number,
  prevState: unknown,
  formData: FormData,
): Promise<{ success: boolean; message: string }> {
  try {
    const user = await requireSession();
    const db = getDb();
    const userId = user.id!;
    const [existing] = await db.select().from(creditCards)
      .where(and(eq(creditCards.id, cardId), eq(creditCards.userId, userId)))
      .limit(1);
    if (!existing) throw new Error("Card not found");

    const name = ((formData.get("name") as string) ?? existing.name).trim();
    const dueDayStr = formData.get("dueDay") as string;
    const dueDay = dueDayStr ? parseInt(dueDayStr) : existing.dueDay;
    const creditLimit = existing.type === "credit" ? parseLimit(formData.get("creditLimit")) : null;

    if (!name) throw new Error("Name is required");
    if (existing.type === "credit" && (!dueDay || dueDay < 1 || dueDay > 31)) {
      throw new Error("Due day is required for credit cards");
    }

    await db.update(creditCards)
      .set({ name, dueDay, creditLimit })
      .where(and(eq(creditCards.id, cardId), eq(creditCards.userId, userId)));
    revalidatePath("/settings");
    revalidatePath("/payments");
    return { success: true, message: "Card updated" };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Failed to update card" };
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
