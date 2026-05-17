"use server";
import { getDb, incomeEntries, incomeSources, months } from "@/lib/db";
import { and, eq, asc, inArray, sql } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";

/**
 * Delete back-filled "expected" income entries from past months.
 * These were created by an older version of generateMonthIncomeEntries
 * that would materialize entries for any visited month, including past
 * ones. Real "arrived" entries (with arrivedDate) are preserved.
 */
export async function cleanupBackfilledPastEntries(): Promise<{ removed: number }> {
  const user = await requireSession();
  const db = getDb();
  const now = new Date();
  const currentKey = now.getFullYear() * 12 + (now.getMonth() + 1);

  const pastMonths = await db.select({ id: months.id })
    .from(months)
    .where(and(
      eq(months.userId, user.id!),
      sql`${months.year} * 12 + ${months.month} < ${currentKey}`,
    ));
  if (pastMonths.length === 0) return { removed: 0 };

  const result = await db.delete(incomeEntries)
    .where(and(
      eq(incomeEntries.userId, user.id!),
      inArray(incomeEntries.monthId, pastMonths.map((m) => m.id)),
      eq(incomeEntries.status, "expected"),
    ))
    .returning({ monthId: incomeEntries.monthId });

  // Resync month.income for affected months
  const affectedMonthIds = Array.from(new Set(result.map((r) => r.monthId)));
  for (const monthId of affectedMonthIds) {
    await recomputeMonthIncome(user.id!, monthId);
  }
  return { removed: result.length };
}

/** Recompute month.income from arrived+expected income entries. */
async function recomputeMonthIncome(userId: string, monthId: number) {
  const db = getDb();
  const [row] = await db.select({
    total: sql<number>`coalesce(sum(${incomeEntries.amount}), 0)`,
  })
    .from(incomeEntries)
    .where(and(
      eq(incomeEntries.userId, userId),
      eq(incomeEntries.monthId, monthId),
      inArray(incomeEntries.status, ["arrived", "expected"]),
    ));
  await db.update(months)
    .set({ income: Number(row?.total ?? 0) })
    .where(and(eq(months.id, monthId), eq(months.userId, userId)));
}

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

  // Don't back-fill past months. An income source created in May 2026 should
  // not materialize "expected" entries for Jan-Apr 2026 just because the user
  // visited /trends or /?month=N for a prior month.
  const now = new Date();
  const targetKey   = year * 12 + month;
  const currentKey  = now.getFullYear() * 12 + (now.getMonth() + 1);
  if (targetKey < currentKey) return;

  const sources = await db.select().from(incomeSources)
    .where(and(eq(incomeSources.userId, user.id!), eq(incomeSources.active, true)));

  let inserted = false;
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
      inserted = true;
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
        inserted = true;
      }
    }
  }
  if (inserted) await recomputeMonthIncome(user.id!, monthId);
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

    await recomputeMonthIncome(user.id!, monthId);
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
    const [updated] = await db.update(incomeEntries)
      .set({ status, arrivedDate })
      .where(and(eq(incomeEntries.id, entryId), eq(incomeEntries.userId, user.id!)))
      .returning({ monthId: incomeEntries.monthId });
    if (updated) await recomputeMonthIncome(user.id!, updated.monthId);
    revalidatePath("/income");
    revalidatePath("/");
    if (status === "arrived") return { success: true, message: "Marked as arrived" };
    return { success: true, message: "Moved to possible" };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Failed to update" };
  }
}

export async function updateIncomeEntry(
  entryId: number,
  prevState: unknown,
  formData: FormData,
): Promise<{ success: boolean; message: string }> {
  try {
    const user = await requireSession();
    const db = getDb();
    const name = (formData.get("name") as string)?.trim();
    const amount = parseFloat((formData.get("amount") as string) ?? "0");
    const expectedDate = (formData.get("expectedDate") as string) || null;
    const status = (formData.get("status") as "expected" | "might_arrive" | "arrived") || "expected";
    if (!name || !amount || amount <= 0) return { success: false, message: "Name + amount required." };
    const arrivedDate = status === "arrived" ? new Date().toISOString().slice(0, 10) : null;
    const [updated] = await db.update(incomeEntries)
      .set({ name, amount, status, expectedDate: expectedDate ?? "", arrivedDate })
      .where(and(eq(incomeEntries.id, entryId), eq(incomeEntries.userId, user.id!)))
      .returning({ monthId: incomeEntries.monthId });
    if (updated) await recomputeMonthIncome(user.id!, updated.monthId);
    revalidatePath("/income");
    revalidatePath("/");
    return { success: true, message: "Entry updated" };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Failed to update entry" };
  }
}

export async function deleteIncomeEntry(entryId: number): Promise<{ success: boolean; message: string }> {
  try {
    const user = await requireSession();
    const db = getDb();
    const [deleted] = await db.delete(incomeEntries)
      .where(and(eq(incomeEntries.id, entryId), eq(incomeEntries.userId, user.id!)))
      .returning({ monthId: incomeEntries.monthId });
    if (deleted) await recomputeMonthIncome(user.id!, deleted.monthId);
    revalidatePath("/income");
    revalidatePath("/");
    return { success: true, message: "Income removed" };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Failed to remove income" };
  }
}
