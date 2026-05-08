"use server";
import { getDb, trips, expenses, tags } from "@/lib/db";
import { and, eq, desc } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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

export async function createTrip(formData: FormData) {
  const user = await requireSession();
  const db = getDb();
  const [trip] = await db.insert(trips).values({
    userId:          user.id!,
    name:            formData.get("name") as string,
    destination:     formData.get("destination") as string,
    startDate:       formData.get("startDate") as string,
    endDate:         formData.get("endDate") as string,
    budgetUsd:       parseFloat(formData.get("budgetUsd") as string),
    primaryCurrency: (formData.get("primaryCurrency") as string) || "USD",
  }).returning();
  revalidatePath("/trips");
  redirect(`/trips/${trip.id}`);
}
