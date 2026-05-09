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

export async function createSavingsAllocation(prevState: unknown, formData: FormData): Promise<{ success: boolean; message: string }> {
  try {
    const user = await requireSession();
    const db = getDb();
    const name = (formData.get("name") as string).trim();
    const percentage = parseInt(formData.get("percentage") as string);
    if (!name || isNaN(percentage) || percentage < 1 || percentage > 100) throw new Error("Invalid data");
    await validateAllocationSum(user.id!, undefined, percentage);
    await db.insert(savingsAllocations).values({ userId: user.id!, name, percentage, sortOrder: 0 });
    revalidatePath("/goals");
    return { success: true, message: "Destination added" };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Failed to add destination" };
  }
}

export async function updateSavingsAllocation(allocationId: number, prevState: unknown, formData: FormData): Promise<{ success: boolean; message: string }> {
  try {
    const user = await requireSession();
    const db = getDb();
    const percentage = parseInt(formData.get("percentage") as string);
    const name = (formData.get("name") as string).trim();
    if (isNaN(percentage) || percentage < 1 || percentage > 100) throw new Error("Invalid percentage");
    await validateAllocationSum(user.id!, allocationId, percentage);
    await db.update(savingsAllocations)
      .set({ percentage, name })
      .where(and(eq(savingsAllocations.id, allocationId), eq(savingsAllocations.userId, user.id!)));
    revalidatePath("/goals");
    return { success: true, message: "Destination updated" };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Failed to update destination" };
  }
}

export async function deleteSavingsAllocation(allocationId: number): Promise<{ success: boolean; message: string }> {
  try {
    const user = await requireSession();
    const db = getDb();
    await db.delete(savingsAllocations)
      .where(and(eq(savingsAllocations.id, allocationId), eq(savingsAllocations.userId, user.id!)));
    revalidatePath("/goals");
    return { success: true, message: "Destination removed" };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Failed to remove destination" };
  }
}
