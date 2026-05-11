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
  const rows = await db.select().from(tags).where(eq(tags.userId, userId));

  // Dedupe by (name, emoji). Historical race conditions in seedDefaultTags
  // could insert the default set multiple times; keep the lowest-id row for
  // each pair so existing expenses keep their tag references.
  const seen = new Set<string>();
  const keep: typeof rows = [];
  for (const t of [...rows].sort((a, b) => a.id - b.id)) {
    const key = `${t.name}|${t.emoji}`;
    if (seen.has(key)) continue;
    seen.add(key);
    keep.push(t);
  }
  return keep;
}

export async function seedDefaultTags() {
  const user = await requireSession();
  const userId = user.id!;
  const db = getDb();
  const existing = await db.select({ name: tags.name }).from(tags).where(eq(tags.userId, userId));
  const existingNames = new Set(existing.map((t) => t.name));
  const toInsert = DEFAULT_TAGS.filter((t) => !existingNames.has(t.name));
  if (toInsert.length === 0) return;
  await db.insert(tags).values(toInsert.map((t) => ({ ...t, userId })));
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
