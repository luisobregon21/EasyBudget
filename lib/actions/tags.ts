"use server";
import { getDb, tags, expenses } from "@/lib/db";
import { and, eq, sql } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";

type Bucket = "savings" | "bills" | "wants";

const DEFAULT_TAGS = [
  { name: "Food",          emoji: "🍕", color: "#f59e0b", defaultBucket: "wants"   as Bucket },
  { name: "Housing",       emoji: "🏠", color: "#a78bfa", defaultBucket: "bills"   as Bucket },
  { name: "Utilities",     emoji: "💡", color: "#60a5fa", defaultBucket: "bills"   as Bucket },
  { name: "Subscriptions", emoji: "📺", color: "#ec4899", defaultBucket: "bills"   as Bucket },
  { name: "Transport",     emoji: "🚗", color: "#34d399", defaultBucket: "wants"   as Bucket },
  { name: "Clothes",       emoji: "👗", color: "#f472b6", defaultBucket: "wants"   as Bucket },
  { name: "Night Out",     emoji: "🎉", color: "#818cf8", defaultBucket: "wants"   as Bucket },
  { name: "Family",        emoji: "👨‍👩‍👧", color: "#fbbf24", defaultBucket: "wants"   as Bucket },
  { name: "Health",        emoji: "💪", color: "#4ade80", defaultBucket: "wants"   as Bucket },
  { name: "Travel",        emoji: "✈️", color: "#38bdf8", defaultBucket: "wants"   as Bucket },
  { name: "Savings",       emoji: "💰", color: "#fbbf24", defaultBucket: "savings" as Bucket },
  { name: "Other",         emoji: "📦", color: "#94a3b8", defaultBucket: "wants"   as Bucket },
];

const BUCKET_COLOR: Record<Bucket, string> = {
  savings: "#fbbf24",
  bills:   "#ec4899",
  wants:   "#a78bfa",
};

function parseTagForm(formData: FormData) {
  const name   = (formData.get("name") as string).trim();
  const emoji  = ((formData.get("emoji") as string) || "🏷️").trim();
  const bucket = (formData.get("defaultBucket") as Bucket) || "wants";
  if (!name) throw new Error("Name is required");
  if (!["savings", "bills", "wants"].includes(bucket)) throw new Error("Invalid bucket");
  return { name, emoji, defaultBucket: bucket, color: BUCKET_COLOR[bucket] };
}

export async function getUserTags() {
  const user = await requireSession();
  const userId = user.id!;
  const db = getDb();
  const rows = await db.select().from(tags).where(eq(tags.userId, userId));

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

export async function createTag(prevState: unknown, formData: FormData): Promise<{ success: boolean; message: string }> {
  try {
    const user = await requireSession();
    const db = getDb();
    const data = parseTagForm(formData);
    await db.insert(tags).values({ ...data, userId: user.id! });
    revalidatePath("/tags");
    revalidatePath("/");
    return { success: true, message: "Tag created" };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Failed to create tag" };
  }
}

export async function updateTag(tagId: number, prevState: unknown, formData: FormData): Promise<{ success: boolean; message: string }> {
  try {
    const user = await requireSession();
    const db = getDb();
    const data = parseTagForm(formData);
    await db.update(tags).set(data)
      .where(and(eq(tags.id, tagId), eq(tags.userId, user.id!)));
    revalidatePath("/tags");
    revalidatePath("/");
    return { success: true, message: "Tag updated" };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Failed to update tag" };
  }
}

export async function deleteTag(tagId: number): Promise<{ success: boolean; message: string }> {
  try {
    const user = await requireSession();
    const db = getDb();
    await db.delete(tags).where(and(eq(tags.id, tagId), eq(tags.userId, user.id!)));
    revalidatePath("/tags");
    revalidatePath("/");
    return { success: true, message: "Tag deleted" };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Failed to delete tag" };
  }
}

export async function countExpensesUsingTag(tagId: number): Promise<number> {
  const user = await requireSession();
  const db = getDb();
  const [row] = await db.select({ count: sql<number>`count(*)` })
    .from(expenses)
    .where(and(eq(expenses.tagId, tagId), eq(expenses.userId, user.id!)));
  return Number(row?.count ?? 0);
}
