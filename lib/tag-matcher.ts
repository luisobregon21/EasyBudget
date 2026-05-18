/**
 * Pure helpers for matching a free-text expense description to a user tag.
 * Used both server-side (in actions) and client-side (in the expense forms).
 *
 * Strategy: word-level containment. The description is normalized
 * (lowercase + diacritic-stripped) and tokenized. We then look for the tag's
 * name or any of its aliases as a whole token. First match wins, ordered by
 * tag id for stability.
 */

export interface MatchableTag {
  id: number;
  name: string;
  aliases?: string | null;  // JSON-encoded string[]
}

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function tokenize(s: string): string[] {
  return normalize(s)
    .split(/[\s.,;:!?"'`()\[\]{}\-\/\\|]+/)
    .filter(Boolean);
}

export function parseAliases(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function matchTagFromDescription<T extends MatchableTag>(
  description: string,
  tags: T[],
): T | null {
  const tokens = new Set(tokenize(description));
  if (tokens.size === 0) return null;

  // Stable ordering by tag id so the same input always picks the same tag.
  const sorted = [...tags].sort((a, b) => a.id - b.id);

  for (const tag of sorted) {
    const candidates = [tag.name, ...parseAliases(tag.aliases)].map(normalize);
    for (const cand of candidates) {
      if (!cand) continue;
      // Multi-word candidate ("night out") → substring check on the normalized full string.
      if (cand.includes(" ")) {
        if (normalize(description).includes(cand)) return tag;
        continue;
      }
      if (tokens.has(cand)) return tag;
    }
  }
  return null;
}
