# Lucide Icon Migration — Design Spec

**Status:** Approved 2026-05-17

## Goal

Replace emoji on dashboard / feed / nav surfaces with `lucide-react` icons so the app feels less playful and more analytic. Tag emoji stays in the database and on the Tags management page (users still pick + edit emoji there); rendering surfaces just consume the icon mapping instead.

## What changes

| Surface | Before | After |
|---------|--------|-------|
| Bills list (any page) | `bill.type` rendered as emoji-by-type via hard-coded map | Lucide `<Icon />` chosen by `bill.type` |
| Recent expenses list | `tag.emoji` (or 📦 fallback) | Lucide `<Icon />` chosen by `tag.name` (with fallback) |
| Trends category ticker | `tag.emoji` | Lucide `<Icon />` chosen by `tag.name` |
| Income entries | (no icon today) | Lucide `CheckCircle2` (arrived) / `Calendar` (expected) |
| Bucket chip on Tags page | 💰 / 🏦 / ✨ emoji + label | Lucide `Landmark` / `Receipt` / `Sparkles` + label |
| Bottom nav | Existing lucide icons | Reordered (see hybrid spec) but icons themselves stay |
| Add Expense drawer (bucket select) | Emoji per bucket | Lucide per bucket |

## What does NOT change

- **Tags management page** (`/tags`) keeps the emoji input / display. That's where users own their tag's emoji.
- **DB schema** unchanged. `tags.emoji` and `tags.color` columns stay populated, just not rendered on the analytic surfaces.

## Icon map (`lib/icons.ts` — new file)

```ts
import {
  AlertCircle, Banknote, Bookmark, Briefcase, Calendar, Car, CheckCircle2,
  Coffee, CreditCard, Dumbbell, Film, Flag, Globe, Heart, Home as HomeIcon,
  Landmark, Music, Plane, Receipt, Sparkles, Tag as TagIcon,
  ShoppingBag, ShoppingCart, UtensilsCrossed, Wallet, Wifi, type LucideIcon,
} from "lucide-react";

// bill.type → icon
export const BILL_ICON: Record<string, LucideIcon> = {
  utility:      Wifi,
  subscription: Film,
  credit_card:  CreditCard,
  loan:         Landmark,
  other:        Receipt,
};

// tag name → icon. Case-insensitive; keys lower-cased.
// Fallback to TagIcon for anything not in the map.
const TAG_NAME_TO_ICON: Record<string, LucideIcon> = {
  food:           UtensilsCrossed,
  groceries:      ShoppingBag,
  dining:         UtensilsCrossed,
  restaurant:     UtensilsCrossed,
  coffee:         Coffee,
  housing:        HomeIcon,
  rent:           HomeIcon,
  utilities:      Wifi,
  subscriptions:  Film,
  transport:      Car,
  transit:        Car,
  car:            Car,
  clothes:        ShoppingCart,
  shopping:       ShoppingCart,
  "night out":    Sparkles,
  family:         Heart,
  health:         Heart,
  fitness:        Dumbbell,
  gym:            Dumbbell,
  travel:         Plane,
  savings:        Landmark,
  "savings auto": Landmark,
  banking:        Banknote,
  other:          Receipt,
};

export function tagIcon(name: string): LucideIcon {
  return TAG_NAME_TO_ICON[name.toLowerCase().trim()] ?? TagIcon;
}

// bucket → icon
export const BUCKET_ICON: Record<"savings" | "bills" | "wants", LucideIcon> = {
  savings: Landmark,
  bills:   Receipt,
  wants:   Sparkles,
};
```

## `IconTile` shared component (`components/ui/icon-tile.tsx`)

Every analytic surface uses the same icon-in-a-tinted-tile look. One component, two sizes.

```tsx
import type { LucideIcon } from "lucide-react";

interface Props {
  icon: LucideIcon;
  tone?: "neutral" | "good" | "bad" | "warn";
  size?: "sm" | "md";
  className?: string;
}

const TONE: Record<NonNullable<Props["tone"]>, string> = {
  neutral: "bg-accent-purple/10 text-accent-purple-light",
  good:    "bg-emerald-500/10 text-emerald-400",
  bad:     "bg-red-500/10 text-red-400",
  warn:    "bg-amber-500/10 text-amber-400",
};

export function IconTile({ icon: Icon, tone = "neutral", size = "sm", className = "" }: Props) {
  const box = size === "md" ? "w-9 h-9" : "w-[30px] h-[30px]";
  const pixelSize = size === "md" ? 16 : 14;
  return (
    <div className={`${box} rounded-[10px] flex items-center justify-center shrink-0 ${TONE[tone]} ${className}`}>
      <Icon size={pixelSize} />
    </div>
  );
}
```

## Files this spec touches

```
lib/icons.ts                                         # NEW — single icon map + tagIcon()
components/ui/icon-tile.tsx                          # NEW — reusable tinted tile
components/dashboard/expense-list.tsx                # modify — use tagIcon + IconTile
components/dashboard/upcoming-bills-strip.tsx        # modify — use BILL_ICON + IconTile
components/dashboard/recent-list.tsx                 # (new in hybrid spec) — uses IconTile
components/bills/bills-group.tsx                     # modify — use BILL_ICON + IconTile
components/income/entry-row.tsx                      # (new in hybrid spec) — uses CheckCircle2 / Calendar via IconTile
components/trends/category-ticker-table.tsx          # modify — replace emoji column with tagIcon
components/tags/bucket-chip.tsx                      # modify — use BUCKET_ICON instead of emoji
components/layout/add-expense-drawer.tsx             # modify — bucket picker uses BUCKET_ICON
```

## Tags page — lucide auto, emoji as user override

`components/tags/tag-row.tsx` renders **lucide auto-derived from `tag.name`** by default. The user can OPTIONALLY set a `tag.emoji` in the edit form; if set, the emoji shows instead of the lucide icon. Both options live together.

Render logic for the view row:

```tsx
{tag.emoji
  ? <span className="text-lg">{tag.emoji}</span>     // user-set override
  : <IconTile icon={tagIcon(tag.name)} />            // auto-derived default
}
```

The edit form keeps the emoji input but the label changes from "Emoji" to "Emoji (optional)" and the placeholder is empty (was `🏷️`). When the user submits an empty string, store `null` — not `""` and not a fallback emoji. Existing rows with `tag.emoji` set keep showing their emoji until the user clears it.

DB schema: `tags.emoji` becomes nullable. Existing rows with `"🏷️"` (the historical default) are migrated to `null` so they show the lucide icon. Other emoji are preserved as user overrides.

## Acceptance criteria

- No emoji visible on Overview / Trends / Bills / Recent / Income surfaces
- Tag emoji still editable + visible on `/tags`
- Every analytic icon uses `<IconTile>` so the visual treatment is consistent across pages
- Unknown tag names fall back to the generic `Tag` icon (not crash)
- Bucket chip on Tags page reads `[icon] Savings` / `[icon] Bills` / `[icon] Personal` (no emoji)

## Out of scope

- Tag-row emoji input control change (stays as text input)
- Removing the `tag.emoji` and `tag.color` DB columns (keep for future / Tags page)
- Per-user icon overrides
- Icon picker for custom mappings (`tag.name === "DoorDash" → ???`); future feature
