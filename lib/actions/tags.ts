"use server";
import { getDb, tags } from "@/lib/db";
import { and, eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";

const DEFAULT_TAGS = [
  { name: "Food",          emoji: "🍕", color: "#f59e0b", defaultBucket: "wants"   as const },
  { name: "Housing",       emoji: "🏠", color: "#a78bfa", defaultBucket: "bills"   as const },
  { name: "Utilities",     emoji: "💡", color: "#60a5fa", defaultBucket: "bills"   as const },
  { name: "Subscriptions", emoji: "📺", color: "#ec4899", defaultBucket: "bills"   as const },
  { name: "Transport",     emoji: "🚗", color: "#34d399", defaultBucket: "wants"   as const },
  { name: "Clothes",       emoji: "👗", color: "#f472b6", defaultBucket: "wants"   as const },
  { name: "Night Out",     emoji: "🎉", color: "#818cf8", defaultBucket: "wants"   as const },
  { name: "Family",        emoji: "👨‍👩‍👧", color: "#fbbf24", defaultBucket: "wants"   as const },
  { name: "Health",        emoji: "💪", color: "#4ade80", defaultBucket: "wants"   as const },
  { name: "Travel",        emoji: "✈️", color: "#38bdf8", defaultBucket: "wants"   as const },
  { name: "Savings",       emoji: "💰", color: "#fbbf24", defaultBucket: "savings" as const },
  { name: "Other",         emoji: "📦", color: "#94a3b8", defaultBucket: "wants"   as const },
];

export async function getUserTags() {
  const user = await requireSession();
  const userId = user.id!;
  const db = getDb();
  return db.select().from(tags).where(eq(tags.userId, userId));
}

export async function seedDefaultTags() {
  const user = await requireSession();
  const userId = user.id!;
  const db = getDb();
  const existing = await db.select().from(tags).where(eq(tags.userId, userId));
  if (existing.length > 0) return;
  await db.insert(tags).values(DEFAULT_TAGS.map((t) => ({ ...t, userId })));
}

export async function createTag(data: { name: string; emoji: string; color: string; defaultBucket: "savings" | "bills" | "wants" }) {
  const user = await requireSession();
  const userId = user.id!;
  const db = getDb();
  const [tag] = await db.insert(tags).values({ ...data, userId }).returning();
  return tag;
}

export async function deleteTag(tagId: number) {
  const user = await requireSession();
  const userId = user.id!;
  const db = getDb();
  await db.delete(tags).where(and(eq(tags.id, tagId), eq(tags.userId, userId)));
}
