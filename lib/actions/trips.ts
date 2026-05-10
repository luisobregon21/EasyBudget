"use server";
import { getDb, trips, expenses, tags } from "@/lib/db";
import { and, eq, desc, isNull, gte, lt, or } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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
