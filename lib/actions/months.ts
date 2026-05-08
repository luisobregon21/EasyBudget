"use server";
import { getDb, months, userSettings } from "@/lib/db";
import { and, eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";

export async function getOrCreateMonth(year: number, month: number) {
  const user = await requireSession();
  const userId = user.id!;
  const db = getDb();
  const existing = await db.select().from(months)
    .where(and(eq(months.userId, userId), eq(months.year, year), eq(months.month, month)))
    .limit(1);

  if (existing[0]) return existing[0];

  const settings = await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
  const defaults = settings[0] ?? { defaultSavingsPct: 20, defaultWantsPct: 10, defaultBillsPct: 70 };

  const [created] = await db.insert(months).values({
    userId,
    year,
    month,
    savingsPct: defaults.defaultSavingsPct,
    wantsPct:   defaults.defaultWantsPct,
    billsPct:   defaults.defaultBillsPct,
  }).returning();

  return created;
}

export async function updateMonthIncome(monthId: number, income: number, openingBalance: number) {
  const user = await requireSession();
  const userId = user.id!;
  const db = getDb();
  await db.update(months)
    .set({ income, openingBalance })
    .where(and(eq(months.id, monthId), eq(months.userId, userId)));
}

export async function updateMonthAllocation(monthId: number, savingsPct: number, wantsPct: number, billsPct: number) {
  const user = await requireSession();
  const userId = user.id!;
  const db = getDb();
  await db.update(months)
    .set({ savingsPct, wantsPct, billsPct })
    .where(and(eq(months.id, monthId), eq(months.userId, userId)));
}
