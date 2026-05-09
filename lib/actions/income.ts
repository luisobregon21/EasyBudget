"use server";
import { getDb, incomeEntries, incomeSources, months } from "@/lib/db";
import { and, eq, asc } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";

export async function getIncomeEntries(monthId: number) {
  const user = await requireSession();
  const db = getDb();
  return db.select().from(incomeEntries)
    .where(and(eq(incomeEntries.monthId, monthId), eq(incomeEntries.userId, user.id!)))
    .orderBy(asc(incomeEntries.expectedDate));
}


export async function generateMonthIncomeEntries(monthId: number, year: number, month: number) {
  const user = await requireSession();
  const db = getDb();

  const sources = await db.select().from(incomeSources)
    .where(and(eq(incomeSources.userId, user.id!), eq(incomeSources.active, true)));

  for (const source of sources) {
    if (source.frequency === "one_time") continue;

    const existing = await db.select().from(incomeEntries)
      .where(and(
        eq(incomeEntries.userId, user.id!),
        eq(incomeEntries.monthId, monthId),
        eq(incomeEntries.sourceId, source.id),
      ))
      .limit(1);

    if (existing.length > 0) continue;

    if (source.frequency === "monthly") {
      await db.insert(incomeEntries).values({
        userId: user.id!,
        sourceId: source.id,
        monthId,
        name: source.name,
        amount: source.amount,
        status: "expected",
        expectedDate: `${year}-${String(month).padStart(2, "0")}-01`,
      });
    } else if (source.frequency === "biweekly") {
      for (const day of [1, 15]) {
        await db.insert(incomeEntries).values({
          userId: user.id!,
          sourceId: source.id,
          monthId,
          name: source.name,
          amount: source.amount,
          status: "expected",
          expectedDate: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
        });
      }
    }
  }
}

export async function createIncomeEntry(prevState: unknown, formData: FormData): Promise<{ success: boolean; message: string }> {
  try {
    const user = await requireSession();
    const db = getDb();
    const monthId = parseInt(formData.get("monthId") as string);
    const name = (formData.get("name") as string).trim();
    const amount = parseFloat(formData.get("amount") as string);
    const status = (formData.get("status") as string) as "expected" | "might_arrive";
    const expectedDate = formData.get("expectedDate") as string;
    const frequency = formData.get("frequency") as "biweekly" | "monthly" | "one_time";

    if (frequency !== "one_time") {
      const [source] = await db.insert(incomeSources).values({
        userId: user.id!,
        name,
        amount,
        frequency,
      }).returning();

      const [monthRow] = await db.select().from(months).where(eq(months.id, monthId)).limit(1);
      if (!monthRow) throw new Error("Month not found");

      if (frequency === "monthly") {
        await db.insert(incomeEntries).values({
          userId: user.id!,
          sourceId: source.id,
          monthId,
          name,
          amount,
          status,
          expectedDate: `${monthRow.year}-${String(monthRow.month).padStart(2, "0")}-01`,
        });
      } else {
        for (const day of [1, 15]) {
          await db.insert(incomeEntries).values({
            userId: user.id!,
            sourceId: source.id,
            monthId,
            name,
            amount,
            status,
            expectedDate: `${monthRow.year}-${String(monthRow.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
          });
        }
      }
    } else {
      await db.insert(incomeEntries).values({
        userId: user.id!,
        sourceId: null,
        monthId,
        name,
        amount,
        status,
        expectedDate,
      });
    }

    revalidatePath("/income");
    revalidatePath("/");
    return { success: true, message: "Income added" };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Failed to add income" };
  }
}

export async function updateIncomeEntryStatus(
  entryId: number,
  status: "expected" | "might_arrive" | "arrived"
): Promise<{ success: boolean; message: string }> {
  try {
    const user = await requireSession();
    const db = getDb();
    const arrivedDate = status === "arrived" ? new Date().toISOString().split("T")[0] : null;
    await db.update(incomeEntries)
      .set({ status, arrivedDate })
      .where(and(eq(incomeEntries.id, entryId), eq(incomeEntries.userId, user.id!)));
    revalidatePath("/income");
    revalidatePath("/");
    if (status === "arrived") return { success: true, message: "Marked as arrived" };
    return { success: true, message: "Moved to possible" };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Failed to update" };
  }
}

export async function deleteIncomeEntry(entryId: number): Promise<{ success: boolean; message: string }> {
  try {
    const user = await requireSession();
    const db = getDb();
    await db.delete(incomeEntries)
      .where(and(eq(incomeEntries.id, entryId), eq(incomeEntries.userId, user.id!)));
    revalidatePath("/income");
    revalidatePath("/");
    return { success: true, message: "Income removed" };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Failed to remove income" };
  }
}
