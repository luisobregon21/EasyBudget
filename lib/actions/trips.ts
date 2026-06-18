"use server";
import { getDb, trips, expenses, tags, months, incomeEntries, bills } from "@/lib/db";
import { and, eq, desc, isNull, gte, lt, lte, or, inArray } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getEffectiveDueDay } from "@/lib/bill-dates";

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

  // 2) Sum income across those months (arrived + expected).
  let income = 0;
  if (monthIds.length > 0) {
    const entries = await db.select({ amount: incomeEntries.amount, status: incomeEntries.status })
      .from(incomeEntries)
      .where(and(
        eq(incomeEntries.userId, userId),
        inArray(incomeEntries.monthId, monthIds),
        inArray(incomeEntries.status, ["arrived", "expected"]),
      ));
    income = entries.reduce((s, e) => s + e.amount, 0);
  }
  if (income === 0) {
    // Fallback to months.income column if no income_entries exist yet.
    income = tripMonths.reduce((s, m) => s + (m.income ?? 0), 0);
  }

  // 3) Recurring deductions: walk every active bill, see if its effective
  //    due day in each trip month is inside the trip's date range. Only
  //    count "predictable" bills.
  const allBills = await db.select().from(bills).where(and(
    eq(bills.userId, userId),
    eq(bills.active, true),
  ));
  const isPredictable = (b: typeof allBills[number]) =>
    b.autoCharge || b.type === "subscription" || b.type === "credit_card" || b.type === "loan";

  let recurring = 0;
  const recurringItems: { name: string; amount: number }[] = [];
  for (const b of allBills) {
    if (!isPredictable(b)) continue;
    for (const m of tripMonths) {
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

  // 4) Available + bucket allocations (avg of per-month pcts, fall back to 20/10/70)
  const available = Math.max(0, income - recurring);
  const avgPct = (key: "savingsPct" | "wantsPct" | "billsPct") =>
    tripMonths.length > 0
      ? tripMonths.reduce((s, m) => s + (m[key] ?? 0), 0) / tripMonths.length
      : key === "savingsPct" ? 20 : key === "wantsPct" ? 10 : 70;
  const savingsPct = Math.round(avgPct("savingsPct"));
  const wantsPct   = Math.round(avgPct("wantsPct"));
  const billsPct   = Math.round(avgPct("billsPct"));

  return {
    income,
    recurring,
    recurringItems,
    available,
    buckets: {
      savings: { pct: savingsPct, amount: available * (savingsPct / 100) },
      wants:   { pct: wantsPct,   amount: available * (wantsPct   / 100) },
      bills:   { pct: billsPct,   amount: available * (billsPct   / 100) },
    },
    monthCount: tripMonths.length,
  };
}
