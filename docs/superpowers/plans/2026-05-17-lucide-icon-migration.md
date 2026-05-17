# Lucide Icon Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Replace emoji on dashboard / feed / nav surfaces with lucide icons in a tinted `<IconTile>`. Tag emoji stays editable on the Tags page.

**Architecture:** One shared `IconTile` component + one icon-mapping module (`lib/icons.ts`). Every consumer (recent expenses, bills, trends ticker, income entries, add-expense bucket picker, bucket chip) imports the tile + mapper instead of the raw emoji.

**Tech Stack:** Next.js 16 · lucide-react (existing)

**Spec:** [docs/superpowers/specs/2026-05-17-lucide-icon-migration-design.md](docs/superpowers/specs/2026-05-17-lucide-icon-migration-design.md)

**Verification:** `npx tsc --noEmit` zero output + commit each task.

---

## File structure

| File | Action | Notes |
|---|---|---|
| `lib/icons.ts` | NEW | `BILL_ICON`, `BUCKET_ICON`, `tagIcon()` |
| `components/ui/icon-tile.tsx` | NEW | Shared 30/36px tinted tile |
| `components/dashboard/expense-list.tsx` | MODIFY | Use `tagIcon` + `IconTile` |
| `components/dashboard/upcoming-bills-strip.tsx` | MODIFY | Use `BILL_ICON` + `IconTile` |
| `components/bills/bills-group.tsx` | (created in hybrid plan; coordinate) | — |
| `components/income/entry-row.tsx` | (created in hybrid plan) | — |
| `components/trends/category-ticker-table.tsx` | MODIFY | Replace emoji with `tagIcon` |
| `components/tags/bucket-chip.tsx` | MODIFY | Use `BUCKET_ICON` instead of emoji |
| `components/layout/add-expense-drawer.tsx` | MODIFY | Bucket picker uses `BUCKET_ICON` |

Files created in the hybrid plan (bills-group, entry-row) will consume `lib/icons.ts` from day one — they don't need a second migration pass.

---

## Task 1: Create `lib/icons.ts`

**Files:** Create `lib/icons.ts`

- [ ] **Step 1: Add the module**

```ts
import {
  Banknote, Briefcase, Calendar, Car, CheckCircle2, Coffee, CreditCard,
  Dumbbell, Film, Heart, Home as HomeIcon, Landmark, Plane, Receipt,
  ShoppingBag, ShoppingCart, Sparkles, Tag as TagIcon, UtensilsCrossed,
  Wifi, type LucideIcon,
} from "lucide-react";

export const BILL_ICON: Record<string, LucideIcon> = {
  utility:      Wifi,
  subscription: Film,
  credit_card:  CreditCard,
  loan:         Landmark,
  other:        Receipt,
};

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
  work:           Briefcase,
  other:          Receipt,
};

export function tagIcon(name: string | null | undefined): LucideIcon {
  if (!name) return TagIcon;
  return TAG_NAME_TO_ICON[name.toLowerCase().trim()] ?? TagIcon;
}

export const BUCKET_ICON: Record<"savings" | "bills" | "wants", LucideIcon> = {
  savings: Landmark,
  bills:   Receipt,
  wants:   Sparkles,
};

// Re-export the common ones for convenience
export { CheckCircle2, Calendar };
```

- [ ] **Step 2: Typecheck + commit**

```bash
npx tsc --noEmit
git add lib/icons.ts
git commit -m "feat(icons): central lib/icons.ts with BILL_ICON, tagIcon, BUCKET_ICON

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Create `components/ui/icon-tile.tsx`

**Files:** Create `components/ui/icon-tile.tsx`

- [ ] **Step 1: Add the component**

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

- [ ] **Step 2: Typecheck + commit**

```bash
npx tsc --noEmit
git add components/ui/icon-tile.tsx
git commit -m "feat(ui): IconTile shared tinted-tile component

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Migrate `expense-list.tsx`

**Files:** Modify `components/dashboard/expense-list.tsx`

- [ ] **Step 1: Read the current file** to see what shape it has (probably a list rendering `e.tagEmoji` or `e.emoji` per row).

- [ ] **Step 2: Replace emoji rendering with `<IconTile icon={tagIcon(e.tagName)} />`**

Find the emoji span:
```tsx
<span>{e.emoji ?? "📦"}</span>
```

Replace with:
```tsx
<IconTile icon={tagIcon(e.tagName ?? e.category)} />
```

Add imports at top:
```tsx
import { IconTile } from "@/components/ui/icon-tile";
import { tagIcon } from "@/lib/icons";
```

If the current row uses an explicit 30×30 div around the emoji, drop it — `<IconTile>` handles the sizing.

- [ ] **Step 3: Typecheck + commit**

```bash
npx tsc --noEmit
git add components/dashboard/expense-list.tsx
git commit -m "feat(dashboard): expense-list uses IconTile + tagIcon

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Migrate `upcoming-bills-strip.tsx`

**Files:** Modify `components/dashboard/upcoming-bills-strip.tsx`

- [ ] **Step 1: Replace the bill emoji with `<IconTile icon={BILL_ICON[b.type]} tone={...}/>`**

Tone mapping: `overdue` → `bad`, `due-soon` → `warn`, otherwise → `neutral`.

Add imports:
```tsx
import { IconTile } from "@/components/ui/icon-tile";
import { BILL_ICON } from "@/lib/icons";
```

- [ ] **Step 2: Typecheck + commit**

```bash
npx tsc --noEmit
git add components/dashboard/upcoming-bills-strip.tsx
git commit -m "feat(dashboard): upcoming-bills-strip uses IconTile + BILL_ICON

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Migrate `category-ticker-table.tsx`

**Files:** Modify `components/trends/category-ticker-table.tsx`

- [ ] **Step 1: Replace `<span>{t.emoji}</span>` with `<IconTile icon={tagIcon(t.name)} />`**

Keep the rest of the table layout unchanged. Adjust grid template if the icon column needs slightly more width (`28px` → `30px`).

- [ ] **Step 2: Typecheck + commit**

```bash
npx tsc --noEmit
git add components/trends/category-ticker-table.tsx
git commit -m "feat(trends): category-ticker-table uses IconTile + tagIcon

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Migrate `bucket-chip.tsx`

**Files:** Modify `components/tags/bucket-chip.tsx`

- [ ] **Step 1: Replace the emoji with the BUCKET_ICON lucide component**

```tsx
import { BUCKET_ICON } from "@/lib/icons";

// inside the component
const Icon = BUCKET_ICON[bucket];

// replace:  <span>{s.emoji}</span>
// with:     <Icon size={size === "md" ? 13 : 11} />
```

The chip's color / bg / border classes stay; only the leading glyph swaps.

- [ ] **Step 2: Typecheck + commit**

```bash
npx tsc --noEmit
git add components/tags/bucket-chip.tsx
git commit -m "feat(tags): BucketChip uses lucide BUCKET_ICON

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Migrate add-expense bucket picker

**Files:** Modify `components/layout/add-expense-drawer.tsx`

- [ ] **Step 1: Find the bucket-picker block** (3 buttons for Savings/Bills/Wants currently using emoji).

- [ ] **Step 2: Replace each emoji label with a `BUCKET_ICON[key]` rendering**

```tsx
import { BUCKET_ICON } from "@/lib/icons";

// inside the picker render
{(["savings", "bills", "wants"] as const).map((key) => {
  const Icon = BUCKET_ICON[key];
  return (
    <button ...>
      <Icon size={16} />
      {LABEL_FOR[key]}
    </button>
  );
})}
```

Keep the button styling exactly as it is. Just swap the glyph.

- [ ] **Step 3: Typecheck + commit**

```bash
npx tsc --noEmit
git add components/layout/add-expense-drawer.tsx
git commit -m "feat(layout): add-expense bucket picker uses lucide BUCKET_ICON

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Production build verify

- [ ] **Step 1: Build**

```bash
npx next build
```

Expected: clean. No new bundle warnings.

- [ ] **Step 2: Visual smoke test on dev**

Hit each surface and confirm icons render in the right tile color:
- `/` — recent expenses (purple tiles), upcoming bills strip (neutral / amber / red)
- `/trends` Categories tab — ticker table icons (neutral)
- `/tags` — bucket chips show lucide icon next to label
- Tap FAB → bucket picker shows lucide icons

If anything looks wrong, fix in-place; no separate task.

---

## Self-review

- `lib/icons.ts` is single source of truth for the mapping
- `IconTile` controls box-size + tone consistently
- Tags page (`/tags`) STILL renders user `tag.emoji` in the row + edit form (only consumer surfaces switched)
- No other components import lucide icons for the same purpose anymore
- Build passes
