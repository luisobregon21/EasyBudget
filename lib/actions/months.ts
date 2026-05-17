"use server";
import { getDb, months, userSettings } from "@/lib/db";
import { and, eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";
import { generateMonthIncomeEntries } from "@/lib/actions/income";

export async function getMonth(year: number, month: number) {
  const user = await requireSession();
  const db = getDb();
  const [row] = await db.select().from(months)
    .where(and(eq(months.userId, user.id!), eq(months.year, year), eq(months.month, month)))
    .limit(1);
  return row ?? null;
}

export async function getOrCreateMonth(year: number, month: number) {
  const user = await requireSession();
  const userId = user.id!;
  const db = getDb();
  const existing = await db.select().from(months)
    .where(and(eq(months.userId, userId), eq(months.year, year), eq(months.month, month)))
    .limit(1);

  if (existing[0]) {
    await generateMonthIncomeEntries(existing[0].id, year, month);
    return existing[0];
  }

  const settings = await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
  const defaults = settings[0] ?? { defaultSavingsPct: 20, defaultWantsPct: 10, defaultBillsPct: 70 };

  // INSERT ... ON CONFLICT DO NOTHING: protects against concurrent requests
  // racing past the SELECT above. The unique index on (user, year, month)
  // makes the second insert a no-op and forces us to re-fetch.
  const created = await db.insert(months).values({
    userId,
    year,
    month,
    savingsPct: defaults.defaultSavingsPct,
    wantsPct:   defaults.defaultWantsPct,
    billsPct:   defaults.defaultBillsPct,
  }).onConflictDoNothing({ target: [months.userId, months.year, months.month] }).returning();

  let row = created[0];
  if (!row) {
    // Someone else inserted concurrently — re-fetch.
    const [refetched] = await db.select().from(months)
      .where(and(eq(months.userId, userId), eq(months.year, year), eq(months.month, month)))
      .limit(1);
    row = refetched;
  }

  await generateMonthIncomeEntries(row.id, year, month);
  return row;
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
