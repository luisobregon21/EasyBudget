"use server";
import { getDb, tags, expenses } from "@/lib/db";
import { and, eq, sql, isNull } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import { generateText, Output } from "ai";
import { z } from "zod";

type Bucket = "savings" | "bills" | "wants";

const DEFAULT_TAGS: { name: string; emoji: string; color: string; defaultBucket: Bucket; aliases: string[] }[] = [
  { name: "Food",          emoji: "🍕", color: "#f59e0b", defaultBucket: "wants",
    aliases: ["comida","almuerzo","cena","desayuno","restaurant","restaurante","pizza","burger","cafe","coffee","starbucks","groceries","supermercado","market","lunch","dinner","breakfast","snack"] },
  { name: "Housing",       emoji: "🏠", color: "#a78bfa", defaultBucket: "bills",
    aliases: ["rent","renta","mortgage","hipoteca","alquiler","casa","home","hoa"] },
  { name: "Utilities",     emoji: "💡", color: "#60a5fa", defaultBucket: "bills",
    aliases: ["electric","electricity","luz","power","water","agua","gas","internet","wifi","fiber","cable","trash","basura","sewer"] },
  { name: "Subscriptions", emoji: "📺", color: "#ec4899", defaultBucket: "bills",
    aliases: ["netflix","spotify","hulu","disney","apple","prime","youtube","subscription","membership","membresia","icloud","gym membership"] },
  { name: "Transport",     emoji: "🚗", color: "#34d399", defaultBucket: "wants",
    aliases: ["gas","gasolina","uber","lyft","taxi","bus","metro","train","parking","peaje","toll","car","carro","auto","ev charge"] },
  { name: "Clothes",       emoji: "👗", color: "#f472b6", defaultBucket: "wants",
    aliases: ["clothes","ropa","shirt","shoes","zapatos","pants","jeans","jacket","dress","vestido","camisa","sneakers"] },
  { name: "Night Out",     emoji: "🎉", color: "#818cf8", defaultBucket: "wants",
    aliases: ["bar","bars","drinks","beers","cerveza","cervezas","cocktail","club","concert","show","party","fiesta","movie","cine","movies"] },
  { name: "Family",        emoji: "👨‍👩‍👧", color: "#fbbf24", defaultBucket: "wants",
    aliases: ["abuelo","abuela","grandpa","grandma","mom","dad","mama","papa","papá","mamá","padre","madre","hermano","hermana","sister","brother","tia","tio","tía","tío","aunt","uncle","cousin","primo","prima","nephew","niece","sobrino","sobrina","family","familia","kids","kid","child","children","hijo","hija"] },
  { name: "Health",        emoji: "💪", color: "#4ade80", defaultBucket: "wants",
    aliases: ["doctor","dentist","medico","médico","pharmacy","farmacia","gym","yoga","therapy","terapia","hospital","clinic","clinica","clínica","medicine","medicina","copay","insurance"] },
  { name: "Travel",        emoji: "✈️", color: "#38bdf8", defaultBucket: "wants",
    aliases: ["flight","flights","airline","airfare","hotel","hostel","airbnb","trip","vuelo","viaje","luggage","baggage","visa","passport"] },
  { name: "Savings",       emoji: "💰", color: "#fbbf24", defaultBucket: "savings",
    aliases: ["savings","ahorro","ahorros","investment","brokerage","401k","ira","emergency fund"] },
  { name: "Other",         emoji: "📦", color: "#94a3b8", defaultBucket: "wants",
    aliases: [] },
];

const BUCKET_COLOR: Record<Bucket, string> = {
  savings: "#fbbf24",
  bills:   "#ec4899",
  wants:   "#a78bfa",
};

function parseTagForm(formData: FormData) {
  const name      = (formData.get("name") as string).trim();
  const emojiRaw  = ((formData.get("emoji") as string) ?? "").trim();
  const emoji     = emojiRaw === "" ? null : emojiRaw;
  const bucket    = (formData.get("defaultBucket") as Bucket) || "wants";
  const aliasesRaw = ((formData.get("aliases") as string) ?? "").trim();
  const aliasList = aliasesRaw
    ? aliasesRaw.split(",").map((s) => s.trim()).filter(Boolean)
    : [];
  const aliases = aliasList.length ? JSON.stringify(aliasList) : null;
  if (!name) throw new Error("Name is required");
  if (!["savings", "bills", "wants"].includes(bucket)) throw new Error("Invalid bucket");
  return { name, emoji, defaultBucket: bucket, color: BUCKET_COLOR[bucket], aliases };
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
  const existing = await db.select({ id: tags.id, name: tags.name, aliases: tags.aliases })
    .from(tags).where(eq(tags.userId, userId));
  const existingByName = new Map(existing.map((t) => [t.name, t]));

  const toInsert = DEFAULT_TAGS.filter((t) => !existingByName.has(t.name));
  if (toInsert.length > 0) {
    await db.insert(tags).values(toInsert.map((t) => ({
      name: t.name,
      emoji: t.emoji,
      color: t.color,
      defaultBucket: t.defaultBucket,
      aliases: t.aliases.length ? JSON.stringify(t.aliases) : null,
      userId,
    })));
  }

  // Back-fill aliases on existing default-named tags that have none yet.
  // Only touches default tags (by name) and only when aliases is null, so user
  // customizations are never overwritten.
  for (const def of DEFAULT_TAGS) {
    const existingTag = existingByName.get(def.name);
    if (!existingTag || existingTag.aliases != null) continue;
    if (def.aliases.length === 0) continue;
    await db.update(tags)
      .set({ aliases: JSON.stringify(def.aliases) })
      .where(and(eq(tags.id, existingTag.id), eq(tags.userId, userId), isNull(tags.aliases)));
  }
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

// ── AI tag suggestion ───────────────────────────────────────────────────────────

/**
 * Fallback for the alias-based matcher: ask an LLM which existing tag fits the
 * description best. Returns null if the model declines or if AI Gateway isn't
 * configured for this environment.
 *
 * Gracefully degrades: missing AI_GATEWAY_API_KEY = no-op (no throw).
 */
export async function suggestTagFromAI(
  description: string,
  tagChoices: { id: number; name: string }[],
): Promise<{ tagId: number | null }> {
  // Feature-flag off for now — set ENABLE_AI_TAGS=1 to re-enable.
  if (process.env.ENABLE_AI_TAGS !== "1") return { tagId: null };

  // Cheap guards: skip noise, runaway pastes, and unconfigured envs.
  const trimmed = description.trim();
  if (trimmed.length < 3 || trimmed.length > 200) return { tagId: null };
  if (tagChoices.length === 0) return { tagId: null };
  // Allow either path: explicit API key, Vercel runtime (auto-OIDC), or a
  // pulled OIDC token in .env.local for local dev.
  if (
    !process.env.AI_GATEWAY_API_KEY &&
    !process.env.VERCEL &&
    !process.env.VERCEL_OIDC_TOKEN
  ) {
    return { tagId: null };
  }

  // Require an authenticated user to use this server action.
  await requireSession();

  const allowedIds = tagChoices.map((t) => t.id);
  const tagList = tagChoices.map((t) => `- ${t.id}: ${t.name}`).join("\n");

  try {
    const { output } = await generateText({
      // Cheap, fast model available on the Vercel AI Gateway.
      // Swap to another `provider/model` id if the structured-output call ever
      // starts failing — surface the error via the console.error below.
      model: "google/gemma-4-26b-a4b-it",
      output: Output.object({
        schema: z.object({
          tagId: z.number().int().nullable().describe(
            "The id of the best-matching tag, or null if none of the tags fit reasonably well.",
          ),
        }),
      }),
      system:
        "You assign budget tags to short expense descriptions. " +
        "Pick exactly ONE tag id from the provided list whose meaning best matches the description. " +
        "Be strict: if no tag clearly fits, return null. " +
        "Examples: 'grocery run' → Food; 'Crunchyroll' → Subscriptions; 'energy drink' → Food; " +
        "'gas station' → Transport; 'random gift' → null (too vague).",
      prompt: `Description: ${trimmed}\n\nAvailable tags:\n${tagList}`,
    });

    if (output.tagId == null) return { tagId: null };
    if (!allowedIds.includes(output.tagId)) return { tagId: null };
    return { tagId: output.tagId };
  } catch (e) {
    // Surface the failure in dev so we can tell config issues (missing OIDC
    // scopes, gateway not enabled, wrong model id) from "model said null".
    console.error("[suggestTagFromAI] gateway call failed:", e instanceof Error ? e.message : e);
    return { tagId: null };
  }
}
