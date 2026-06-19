"use server";
import { getDb, trips, expenses, tags, months, incomeEntries, bills, billPayments, tripCategoryBudgets } from "@/lib/db";
import { and, eq, desc, isNull, gte, lt, lte, or, inArray } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getEffectiveDueDay } from "@/lib/bill-dates";
import {
  TRIP_CATEGORIES,
  TRIP_CATEGORY_META,
  tripCategoryForTagName,
  type TripCategory,
} from "@/lib/trip-categories";

export async function getActiveTrips() {
  const user = await requireSession();
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);
  return db.select().from(trips)
    .where(and(
      eq(trips.userId, user.id!),
      or(isNull(trips.endDate), gte(trips.endDate, today)),
    ))
    .orderBy(desc(trips.startDate));
}

export async function getPastTrips() {
  const user = await requireSession();
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);
  return db.select().from(trips)
    .where(and(eq(trips.userId, user.id!), lt(trips.endDate, today)))
    .orderBy(desc(trips.startDate));
}

export async function getUserTrips() {
  const user = await requireSession();
  const db = getDb();
  return db.select().from(trips).where(eq(trips.userId, user.id!)).orderBy(desc(trips.startDate));
}

export async function getTrip(tripId: number) {
  const user = await requireSession();
  const db = getDb();
  const [trip] = await db.select().from(trips)
    .where(and(eq(trips.id, tripId), eq(trips.userId, user.id!))).limit(1);
  return trip ?? null;
}

export async function getTripExpenses(tripId: number) {
  const user = await requireSession();
  const db = getDb();
  return db.select({
    id:          expenses.id,
    description: expenses.description,
    amount:      expenses.amount,
    currency:    expenses.currency,
    amountUsd:   expenses.amountUsd,
    date:        expenses.date,
    bucket:      expenses.bucket,
    tagId:       expenses.tagId,
    tagName:     tags.name,
    tagEmoji:    tags.emoji,
  })
  .from(expenses)
  .leftJoin(tags, eq(expenses.tagId, tags.id))
  .where(and(eq(expenses.tripId, tripId), eq(expenses.userId, user.id!)))
  .orderBy(desc(expenses.date));
}

export async function createTrip(prevState: unknown, formData: FormData): Promise<{ success: boolean; message: string }> {
  const user = await requireSession();
  const db = getDb();
  const noEndDate = formData.get("noEndDate") === "on";
  const endDateRaw = formData.get("endDate") as string | null;

  const budgetRaw = formData.get("budgetUsd") as string;
  const [trip] = await db.insert(trips).values({
    userId:          user.id!,
    name:            formData.get("name") as string,
    destination:     formData.get("destination") as string,
    startDate:       formData.get("startDate") as string,
    endDate:         noEndDate || !endDateRaw ? null : endDateRaw,
    budgetUsd:       budgetRaw ? parseFloat(budgetRaw) : null,
    primaryCurrency: (formData.get("primaryCurrency") as string) || "USD",
  }).returning();
  revalidatePath("/trips");
  redirect(`/trips/${trip.id}`);
}

export async function updateTripDetails(
  tripId: number,
  prevState: unknown,
  formData: FormData,
): Promise<{ success: boolean; message: string }> {
  try {
    const user = await requireSession();
    const db = getDb();
    const name = ((formData.get("name") as string) ?? "").trim();
    const destination = ((formData.get("destination") as string) ?? "").trim();
    const primaryCurrency = ((formData.get("primaryCurrency") as string) ?? "USD").trim().toUpperCase();
    if (!name) return { success: false, message: "Name required." };
    if (!destination) return { success: false, message: "Destination required." };
    if (!primaryCurrency) return { success: false, message: "Currency required." };

    await db.update(trips).set({ name, destination, primaryCurrency })
      .where(and(eq(trips.id, tripId), eq(trips.userId, user.id!)));
    revalidatePath("/trips");
    revalidatePath(`/trips/${tripId}`);
    return { success: true, message: "Trip updated" };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Failed to update trip" };
  }
}

export async function updateTripDates(tripId: number, prevState: unknown, formData: FormData): Promise<{ success: boolean; message: string }> {
  try {
    const user = await requireSession();
    const db = getDb();
    const startDate = formData.get("startDate") as string;
    const endDate = (formData.get("endDate") as string) || null;
    if (!startDate) return { success: false, message: "Start date required." };
    if (endDate && endDate < startDate) return { success: false, message: "End date must be after start date." };
    await db.update(trips).set({ startDate, endDate })
      .where(and(eq(trips.id, tripId), eq(trips.userId, user.id!)));
    revalidatePath("/trips");
    revalidatePath(`/trips/${tripId}`);
    return { success: true, message: "Dates updated" };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Failed to update dates" };
  }
}

export async function endTrip(tripId: number, prevState: unknown, formData: FormData): Promise<{ success: boolean; message: string }> {
  const user = await requireSession();
  const db = getDb();

  const [trip] = await db.select().from(trips)
    .where(and(eq(trips.id, tripId), eq(trips.userId, user.id!))).limit(1);
  if (!trip) return { success: false, message: "Trip not found." };

  const endDateRaw = formData.get("endDate") as string;
  if (!endDateRaw) return { success: false, message: "End date is required." };
  if (endDateRaw < trip.startDate) return { success: false, message: "End date must be after start date." };

  await db.update(trips).set({ endDate: endDateRaw })
    .where(and(eq(trips.id, tripId), eq(trips.userId, user.id!)));
  revalidatePath("/trips");
  revalidatePath(`/trips/${tripId}`);
  return { success: true, message: "Trip ended." };
}

/**
 * Compute trip-scoped financial context:
 *  - income (arrived + expected) summed across the months the trip overlaps
 *  - "recurring" deductions for predictable bills (subscriptions, auto-charged,
 *    or type='credit_card'/'loan') whose effective due day falls inside the
 *    trip's date range. Variable utilities (water/electric without autoCharge)
 *    are intentionally excluded — they're unpredictable.
 *  - available = income - recurring
 *  - per-bucket allocations using the avg of monthly savings/wants/bills pcts
 *
 * Works for both budget-set and "plan as you go" trips. Returns nulls only
 * for unrecoverable failures (no overlapping months).
 */
export async function getTripFinancials(tripId: number) {
  const user = await requireSession();
  const userId = user.id!;
  const db = getDb();

  const [trip] = await db.select().from(trips)
    .where(and(eq(trips.id, tripId), eq(trips.userId, userId))).limit(1);
  if (!trip) return null;

  // End of trip — use today if ongoing.
  const today = new Date().toISOString().slice(0, 10);
  const endDate = trip.endDate ?? today;

  // 1) Find every month row overlapping the trip window.
  //    A trip from 2026-05-15 to 2026-06-05 overlaps May + June.
  const [sy, sm] = trip.startDate.split("-").map(Number);
  const [ey, em] = endDate.split("-").map(Number);
  const monthRows = await db.select().from(months).where(and(
    eq(months.userId, userId),
    or(
      // Any month between (year,month) >= (sy,sm) AND <= (ey,em)
      and(eq(months.year, sy), gte(months.month, sm), eq(months.month, sm)), // exact start month
      and(eq(months.year, ey), lte(months.month, em), eq(months.month, em)), // exact end month
      and(gte(months.year, sy + 1), lte(months.year, ey - 1)),               // years strictly between
    ),
  ));
  // Drizzle's mixed (year,month) range is awkward — re-filter in JS to be safe.
  const inWindow = (y: number, m: number) => {
    if (y < sy || y > ey) return false;
    if (y === sy && m < sm) return false;
    if (y === ey && m > em) return false;
    return true;
  };
  const tripMonths = monthRows.filter((r) => inWindow(r.year, r.month));
  const monthIds = tripMonths.map((m) => m.id);

  // 2) Income = arrived-only across the trip months. This is what's actually
  //    in the account, not what's still pending. Expected income shouldn't
  //    count toward what's spendable on the trip.
  let income = 0;
  if (monthIds.length > 0) {
    const entries = await db.select({ amount: incomeEntries.amount })
      .from(incomeEntries)
      .where(and(
        eq(incomeEntries.userId, userId),
        inArray(incomeEntries.monthId, monthIds),
        eq(incomeEntries.status, "arrived"),
      ));
    income = entries.reduce((s, e) => s + e.amount, 0);
  }

  // 3) Recurring deductions: every active monthly/yearly/quarterly bill that
  //    hits during the trip window. Subscriptions, utilities, rent, gym —
  //    they all reduce available cash. Bills the user has explicitly skipped
  //    for a given month are excluded.
  const [allBills, skipRows] = await Promise.all([
    db.select().from(bills).where(and(
      eq(bills.userId, userId),
      eq(bills.active, true),
    )),
    monthIds.length > 0
      ? db.select({ billId: billPayments.billId, monthId: billPayments.monthId })
          .from(billPayments)
          .where(and(
            eq(billPayments.userId, userId),
            eq(billPayments.skipped, true),
            inArray(billPayments.monthId, monthIds),
          ))
      : Promise.resolve([]),
  ]);
  const skippedSet = new Set(skipRows.map((r) => `${r.billId}|${r.monthId}`));

  let recurring = 0;
  const recurringItems: { name: string; amount: number }[] = [];
  for (const b of allBills) {
    for (const m of tripMonths) {
      if (skippedSet.has(`${b.id}|${m.id}`)) continue;
      const day = getEffectiveDueDay({
        dueDay: b.dueDay,
        frequency: b.frequency,
        renewalDay: b.renewalDay,
        quarterlyDates: b.quarterlyDates,
      }, m.month);
      if (day == null) continue;
      // Yearly bills only count if the month matches the renewal month too.
      if (b.frequency === "yearly" && b.renewalMonth !== m.month) continue;
      const dateStr = `${m.year}-${String(m.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      if (dateStr < trip.startDate || dateStr > endDate) continue;
      recurring += b.amount;
      recurringItems.push({ name: b.name, amount: b.amount });
    }
  }

  // 4) Trip-spendable = arrivedIncome − recurring − savingsHold.
  //    Savings % comes from the user's overall budget (avg of per-month
  //    months.savingsPct, fall back to 20). Savings is computed against the
  //    full arrived income, NOT (income − recurring), because savings is held
  //    off the top of paychecks, before bills get paid.
  const avgSavingsPct = tripMonths.length > 0
    ? tripMonths.reduce((s, m) => s + (m.savingsPct ?? 0), 0) / tripMonths.length
    : 20;
  const savingsPct = Math.round(avgSavingsPct);
  const savingsHold = Math.round(income * (savingsPct / 100) * 100) / 100;
  const tripSpendable = Math.max(0, income - recurring - savingsHold);

  // 5) Per-category budgets (sparse) + per-category spend (sum of trip
  //    expenses grouped by mapped category).
  const [budgetRows, tripExpenseRows] = await Promise.all([
    db.select({ category: tripCategoryBudgets.category, amount: tripCategoryBudgets.amount })
      .from(tripCategoryBudgets)
      .where(and(
        eq(tripCategoryBudgets.userId, userId),
        eq(tripCategoryBudgets.tripId, tripId),
      )),
    db.select({
      amountUsd: expenses.amountUsd,
      tagName:   tags.name,
    })
      .from(expenses)
      .leftJoin(tags, eq(expenses.tagId, tags.id))
      .where(and(
        eq(expenses.userId, userId),
        eq(expenses.tripId, tripId),
      )),
  ]);

  const budgetByCategory = new Map<TripCategory, number>();
  for (const row of budgetRows) {
    budgetByCategory.set(row.category as TripCategory, row.amount);
  }

  const spentByCategory = new Map<TripCategory, number>();
  for (const cat of TRIP_CATEGORIES) spentByCategory.set(cat, 0);
  for (const e of tripExpenseRows) {
    const cat = tripCategoryForTagName(e.tagName);
    spentByCategory.set(cat, (spentByCategory.get(cat) ?? 0) + (e.amountUsd ?? 0));
  }

  const categories = TRIP_CATEGORIES.map((cat) => {
    const meta = TRIP_CATEGORY_META[cat];
    return {
      category: cat,
      label:    meta.label,
      emoji:    meta.emoji,
      color:    meta.color,
      budget:   Math.round((budgetByCategory.get(cat) ?? 0) * 100) / 100,
      spent:    Math.round((spentByCategory.get(cat) ?? 0) * 100) / 100,
    };
  });

  const totalBudgeted = Math.round(categories.reduce((s, c) => s + c.budget, 0) * 100) / 100;
  const totalSpent    = Math.round(categories.reduce((s, c) => s + c.spent,  0) * 100) / 100;

  return {
    income,
    recurring,
    recurringItems,
    savingsPct,
    savingsHold,
    tripSpendable,
    monthCount: tripMonths.length,
    categories,
    totalBudgeted,
    totalSpent,
  };
}

// ── Per-trip category budgets ────────────────────────────────────────────────

const VALID_CATEGORIES = new Set<TripCategory>(TRIP_CATEGORIES);

/** Set or update a category budget for a trip. amount<=0 → delete the row. */
export async function setTripCategoryBudget(
  tripId: number,
  category: TripCategory,
  amount: number,
): Promise<{ success: boolean; message: string }> {
  try {
    const user = await requireSession();
    const userId = user.id!;
    const db = getDb();

    if (!VALID_CATEGORIES.has(category)) {
      return { success: false, message: "Invalid category." };
    }
    if (!Number.isFinite(amount) || amount < 0) {
      return { success: false, message: "Amount must be 0 or positive." };
    }

    // Ownership check on the trip.
    const [trip] = await db.select({ id: trips.id }).from(trips)
      .where(and(eq(trips.id, tripId), eq(trips.userId, userId))).limit(1);
    if (!trip) return { success: false, message: "Trip not found." };

    if (amount === 0) {
      await db.delete(tripCategoryBudgets).where(and(
        eq(tripCategoryBudgets.userId, userId),
        eq(tripCategoryBudgets.tripId, tripId),
        eq(tripCategoryBudgets.category, category),
      ));
    } else {
      // Upsert via ON CONFLICT against (tripId, category) unique index.
      await db.insert(tripCategoryBudgets).values({ userId, tripId, category, amount })
        .onConflictDoUpdate({
          target: [tripCategoryBudgets.tripId, tripCategoryBudgets.category],
          set: { amount },
        });
    }

    revalidatePath(`/trips/${tripId}`);
    return { success: true, message: "Budget updated." };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Failed to update budget." };
  }
}

/** Hard-delete a category budget row. */
export async function clearTripCategoryBudget(
  tripId: number,
  category: TripCategory,
): Promise<{ success: boolean; message: string }> {
  try {
    const user = await requireSession();
    const userId = user.id!;
    const db = getDb();
    await db.delete(tripCategoryBudgets).where(and(
      eq(tripCategoryBudgets.userId, userId),
      eq(tripCategoryBudgets.tripId, tripId),
      eq(tripCategoryBudgets.category, category),
    ));
    revalidatePath(`/trips/${tripId}`);
    return { success: true, message: "Category cleared." };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Failed to clear category." };
  }
}
