"use server";
import { getDb, savingsAllocations } from "@/lib/db";
import { and, eq, asc } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";

export async function getSavingsAllocations() {
  const user = await requireSession();
  const db = getDb();
  return db.select().from(savingsAllocations)
    .where(eq(savingsAllocations.userId, user.id!))
    .orderBy(asc(savingsAllocations.sortOrder), asc(savingsAllocations.id));
}

async function validateAllocationSum(userId: string, excludeId?: number, newPct?: number) {
  const db = getDb();
  const all = await db.select().from(savingsAllocations)
    .where(eq(savingsAllocations.userId, userId));
  const total = all
    .filter((a) => a.id !== excludeId)
    .reduce((s, a) => s + a.percentage, 0) + (newPct ?? 0);
  if (total > 100) throw new Error(`Allocations exceed 100% (currently ${total}%)`);
}

export async function createSavingsAllocation(formData: FormData) {
  const user = await requireSession();
  const db = getDb();
  const name = (formData.get("name") as string).trim();
  const percentage = parseInt(formData.get("percentage") as string);
  if (!name || isNaN(percentage) || percentage < 1 || percentage > 100) throw new Error("Invalid data");
  await validateAllocationSum(user.id!, undefined, percentage);
  await db.insert(savingsAllocations).values({ userId: user.id!, name, percentage, sortOrder: 0 });
  revalidatePath("/goals");
}

export async function updateSavingsAllocation(id: number, formData: FormData) {
  const user = await requireSession();
  const db = getDb();
  const percentage = parseInt(formData.get("percentage") as string);
  const name = (formData.get("name") as string).trim();
  if (isNaN(percentage) || percentage < 1 || percentage > 100) throw new Error("Invalid percentage");
  await validateAllocationSum(user.id!, id, percentage);
  await db.update(savingsAllocations)
    .set({ percentage, name })
    .where(and(eq(savingsAllocations.id, id), eq(savingsAllocations.userId, user.id!)));
  revalidatePath("/goals");
}

export async function deleteSavingsAllocation(id: number) {
  const user = await requireSession();
  const db = getDb();
  await db.delete(savingsAllocations)
    .where(and(eq(savingsAllocations.id, id), eq(savingsAllocations.userId, user.id!)));
  revalidatePath("/goals");
}
