/**
 * Fixed set of trip-spending categories. Every trip expense ends up in one
 * of these via its tag (mapped by name). Anything unmapped falls through to
 * "other". Pure module — no DB or session imports — so both server actions
 * and client components can use it.
 */

export type TripCategory =
  | "housing"
  | "transport"
  | "night_out"
  | "dining_out"
  | "groceries"
  | "shopping"
  | "lodging"
  | "other";

/** Order shown on the trip page. */
export const TRIP_CATEGORIES: TripCategory[] = [
  "lodging",
  "dining_out",
  "groceries",
  "transport",
  "night_out",
  "shopping",
  "housing",
  "other",
];

export const TRIP_CATEGORY_META: Record<
  TripCategory,
  { label: string; emoji: string; color: string }
> = {
  lodging:    { label: "Lodging",    emoji: "🏨", color: "#a78bfa" },
  dining_out: { label: "Dining Out", emoji: "🍽️", color: "#f472b6" },
  groceries:  { label: "Groceries",  emoji: "🛒", color: "#34d399" },
  transport:  { label: "Transport",  emoji: "🚕", color: "#fbbf24" },
  night_out:  { label: "Night Out",  emoji: "🎉", color: "#818cf8" },
  shopping:   { label: "Shopping",   emoji: "🛍️", color: "#f87171" },
  housing:    { label: "Housing",    emoji: "🏠", color: "#60a5fa" },
  other:      { label: "Other",      emoji: "📦", color: "#94a3b8" },
};

/**
 * Tag-name → trip category. Case-insensitive lookup. Anything missing → "other".
 *
 * Maps both the new trip-relevant tags (Lodging, Groceries, Dining Out, etc)
 * AND legacy tags users may already have (Food → Groceries, Utilities →
 * Housing) so trip spend reports correctly without forcing a re-tag.
 */
const TAG_NAME_TO_CATEGORY: Record<string, TripCategory> = {
  "lodging":        "lodging",
  "dining out":     "dining_out",
  "groceries":      "groceries",
  "food":           "groceries",   // legacy
  "transportation": "transport",
  "transport":      "transport",
  "night out":      "night_out",
  "shopping":       "shopping",
  "housing":        "housing",
  "utilities":      "housing",     // utilities are housing-adjacent on a trip
};

export function tripCategoryForTagName(tagName: string | null | undefined): TripCategory {
  if (!tagName) return "other";
  return TAG_NAME_TO_CATEGORY[tagName.toLowerCase()] ?? "other";
}
