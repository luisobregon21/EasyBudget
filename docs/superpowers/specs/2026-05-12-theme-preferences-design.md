# Theme + Density Preferences — Design Spec

**Status:** Approved 2026-05-12
**Depends on:** Refined Hybrid spec (which expects `colorScheme` and `density` to exist as preferences).

## Goal

Make the design tweaks (color scheme, density) that lived in the design-canvas tweaks panel real user-facing preferences. User opens Settings, picks "Gradient" or "Mint" for color, "Compact / Regular / Comfy" for density. Choice persists across sessions, sync-free (localStorage).

## Surface

A new "Appearance" section on `/settings` with two controls:

```
Appearance
─────────────────────────────────────────────────
Color scheme
  ⦿ Gradient (amber → pink)        ○ Mint (calmer)

Density
  ○ Compact      ⦿ Regular      ○ Comfy
```

Settings page already exists; this lives between the existing sections (somewhere natural — probably right under the profile / before payment methods).

## Model

```ts
// lib/theme.ts (new)
export type ColorScheme = "gradient" | "mint";
export type Density = "compact" | "regular" | "comfy";

export interface AppPreferences {
  colorScheme: ColorScheme;
  density: Density;
}

export const DEFAULT_PREFERENCES: AppPreferences = {
  colorScheme: "gradient",
  density: "regular",
};

const STORAGE_KEY = "easybudget.preferences";

// Client-side helpers
export function readPreferences(): AppPreferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw);
    return {
      colorScheme: parsed?.colorScheme === "mint" ? "mint" : "gradient",
      density: ["compact", "regular", "comfy"].includes(parsed?.density) ? parsed.density : "regular",
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function writePreferences(next: Partial<AppPreferences>) {
  const current = readPreferences();
  const merged = { ...current, ...next };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  window.dispatchEvent(new CustomEvent("preferences-changed", { detail: merged }));
}
```

A custom event lets components live-update without a full reload.

## React integration

```tsx
// components/providers/preferences-provider.tsx
"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { readPreferences, writePreferences, type AppPreferences, DEFAULT_PREFERENCES } from "@/lib/theme";

const Ctx = createContext<{
  prefs: AppPreferences;
  setColorScheme: (v: ColorScheme) => void;
  setDensity: (v: Density) => void;
}>({ prefs: DEFAULT_PREFERENCES, setColorScheme: () => {}, setDensity: () => {} });

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<AppPreferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    setPrefs(readPreferences());
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent).detail as AppPreferences;
      if (detail) setPrefs(detail);
    };
    window.addEventListener("preferences-changed", onChange);
    return () => window.removeEventListener("preferences-changed", onChange);
  }, []);

  // Apply to <html> data attributes so CSS variables flip without a re-render
  useEffect(() => {
    document.documentElement.dataset.colorScheme = prefs.colorScheme;
    document.documentElement.dataset.density = prefs.density;
  }, [prefs.colorScheme, prefs.density]);

  return (
    <Ctx.Provider value={{
      prefs,
      setColorScheme: (v) => writePreferences({ colorScheme: v }),
      setDensity:     (v) => writePreferences({ density: v }),
    }}>
      {children}
    </Ctx.Provider>
  );
}

export const usePreferences = () => useContext(Ctx);
```

`PreferencesProvider` wraps `{children}` inside the root `<body>` in `app/layout.tsx` (must be after the `Toaster` provider, since it consumes nothing else).

## CSS — token swap

Tokens live in `app/globals.css`. The hybrid spec already defines them. The theme provider adds `data-color-scheme="mint"` to `<html>` when selected. CSS reads via attribute selectors:

```css
:root,
:root[data-color-scheme="gradient"] {
  --accent:  #f59e0b;
  --accent2: #ec4899;
  --gradient-brand: linear-gradient(90deg, #f59e0b 0%, #ec4899 100%);
  --bucket-savings: #f59e0b;
  --bucket-bills:   #ec4899;
  --bucket-wants:   #a78bfa;
  --bg:      #0d0918;
  --bg-deep: #0a0613;
  --card:    #181028;
}

:root[data-color-scheme="mint"] {
  --accent:  #6ee7b7;
  --accent2: #34d399;
  --gradient-brand: linear-gradient(90deg, #6ee7b7 0%, #34d399 100%);
  --bucket-savings: #6ee7b7;
  --bucket-bills:   #fbbf24;
  --bucket-wants:   #a78bfa;
  --bg:      #0a1310;
  --bg-deep: #070d0b;
  --card:    #0e1a16;
}

:root[data-density="compact"] {
  --density-scale: 0.92;
}
:root[data-density="regular"] {
  --density-scale: 1;
}
:root[data-density="comfy"] {
  --density-scale: 1.08;
}
```

The Tailwind v4 `@theme` block already maps tokens to color names. We update it to use the new CSS variables instead of hardcoded hex (existing names — `bg-deep`, `accent-purple`, etc. — stay; their `var(...)` definitions get swapped).

Density `--density-scale` is consumed by spacing utilities via a `style` prop pattern on cards (no overhaul of every Tailwind class — just a few key cards multiply `padding` and `gap` by the CSS var).

## Settings page additions

`app/(app)/settings/page.tsx` — locate the existing layout, add a new section:

```tsx
import { ColorSchemePicker } from "@/components/settings/color-scheme-picker";
import { DensityPicker } from "@/components/settings/density-picker";

// ...
<section className="space-y-3">
  <h3 className="text-foreground font-semibold text-sm">Appearance</h3>
  <ColorSchemePicker />
  <DensityPicker />
</section>
```

Two new client components:

```tsx
// components/settings/color-scheme-picker.tsx
"use client";
import { usePreferences } from "@/components/providers/preferences-provider";

export function ColorSchemePicker() {
  const { prefs, setColorScheme } = usePreferences();
  return (
    <div className="rounded-2xl bg-white/[0.03] border border-accent-purple/10 p-4 space-y-2">
      <p className="text-muted-base text-[10px] uppercase tracking-widest font-semibold">Color scheme</p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setColorScheme("gradient")}
          className={`rounded-xl p-3 text-left transition-colors ${
            prefs.colorScheme === "gradient"
              ? "bg-gradient-to-br from-amber-400/15 to-pink-500/15 border border-amber-400/40"
              : "border border-accent-purple/20 hover:bg-white/[0.04]"
          }`}
        >
          <span className="block text-foreground text-sm font-bold">Gradient</span>
          <span className="block text-muted-base text-[10px]">amber → pink</span>
        </button>
        <button
          type="button"
          onClick={() => setColorScheme("mint")}
          className={`rounded-xl p-3 text-left transition-colors ${
            prefs.colorScheme === "mint"
              ? "bg-emerald-500/15 border border-emerald-400/40"
              : "border border-accent-purple/20 hover:bg-white/[0.04]"
          }`}
        >
          <span className="block text-foreground text-sm font-bold">Mint</span>
          <span className="block text-muted-base text-[10px]">calmer</span>
        </button>
      </div>
    </div>
  );
}
```

Same shape for `DensityPicker` with three options.

## Hydration handling

`localStorage` is not available server-side. Server render uses defaults (`gradient`, `regular`). On client hydration, `PreferencesProvider` reads localStorage and applies the data attribute — flicker is short (<1 frame on a real device). A larger fix would store in a cookie and read server-side, but that's a follow-up. Acceptable for V1 since the default IS the gradient theme.

## Files

```
lib/theme.ts                                  # NEW — types + read/write helpers
components/providers/preferences-provider.tsx # NEW — context + event listener + DOM data attrs
components/settings/color-scheme-picker.tsx   # NEW — client toggle
components/settings/density-picker.tsx        # NEW — client toggle
app/layout.tsx                                # modify — wrap children with PreferencesProvider
app/globals.css                               # modify — token CSS variables for both schemes
app/(app)/settings/page.tsx                   # modify — add Appearance section
```

## Acceptance criteria

- Setting → Gradient: `<html data-color-scheme="gradient">`, accent reads amber→pink
- Setting → Mint: `<html data-color-scheme="mint">`, accent reads mint, bg shifts to green-tinted
- Switch persists across reload
- Switch is visually instant (no full reload)
- Default for new users: gradient, regular
- Existing pages keep working with the existing Tailwind classes (no purge issues from token rename — names stay)

## Out of scope

- No system-pref `prefers-color-scheme` integration yet (the app is dark-only; light mode is a separate spec)
- No font-family preference
- No cookie-backed SSR-aware theme (V2)
- No per-page overrides
- No animation between schemes (instant swap)
