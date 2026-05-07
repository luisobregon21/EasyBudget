# EasyBudget MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fully adaptive PWA for personal budget tracking — income, expenses, bills, trips, and reminders — with a Bold Gradient visual theme.

**Architecture:** Next.js 15 App Router PWA with server actions for mutations, Vercel Postgres (Neon) via Drizzle ORM for storage, Auth.js v5 for authentication, and shadcn/ui with a custom Bold Gradient Tailwind theme. Layout adapts: bottom nav on mobile, sidebar on desktop.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, Drizzle ORM, `@neondatabase/serverless` (via Vercel Marketplace), Auth.js v5, `web-push`, `open-exchange-rates` (free API)

---

## File Map

```
app/
  (auth)/
    login/page.tsx              # Sign-in page
  (app)/
    layout.tsx                  # App shell — sidebar + bottom nav
    page.tsx                    # Home — monthly overview
    expenses/
      page.tsx                  # Full expense log
      new/page.tsx              # Add expense form
    bills/
      page.tsx                  # Bills & subscriptions manager
      new/page.tsx              # Add/edit bill
    trips/
      page.tsx                  # Trip list
      [id]/page.tsx             # Trip detail
      new/page.tsx              # Create trip
    trends/page.tsx             # Charts
    tags/page.tsx               # Tag manager
    goals/page.tsx              # Goals & allocation settings
    settings/page.tsx           # Account + notifications
  api/
    auth/[...nextauth]/route.ts # Auth.js handler
    exchange-rate/route.ts      # Proxy exchange rate API

components/
  layout/
    sidebar.tsx                 # Desktop sidebar nav
    bottom-nav.tsx              # Mobile bottom tab nav
    app-shell.tsx               # Responsive wrapper
    month-switcher.tsx          # ‹ Month Year › control
  dashboard/
    hero-card.tsx               # Income + balance hero
    allocation-card.tsx         # Savings/Bills/Wants card
    expense-list.tsx            # Recent expenses panel
    subscriptions-panel.tsx     # Subscriptions + renewals
    upcoming-bills-strip.tsx    # Bills due in next 7 days
  expenses/
    expense-form.tsx            # Add/edit expense form
    payment-method-picker.tsx   # Cash / Debit / CC selector
    currency-picker.tsx         # Currency + live rate display
    tag-picker.tsx              # Tag pill selector
  bills/
    bill-form.tsx               # Add/edit bill form
    bill-list.tsx               # Bills list with due dates
  trips/
    trip-form.tsx               # Create trip form
    trip-card.tsx               # Trip envelope summary card
  ui/                           # shadcn/ui components (auto-generated)

lib/
  db/
    schema.ts                   # Drizzle schema (all tables)
    index.ts                    # db client singleton
    migrations/                 # Drizzle migration files
  auth/
    config.ts                   # Auth.js config (providers, adapter)
    session.ts                  # getSession helper
  actions/
    expenses.ts                 # Server actions: createExpense, deleteExpense
    bills.ts                    # Server actions: createBill, updateBill, deleteBill
    months.ts                   # Server actions: getOrCreateMonth, updateAllocation
    trips.ts                    # Server actions: createTrip, updateTrip
    tags.ts                     # Server actions: createTag, updateTag, deleteTag
    settings.ts                 # Server actions: updateUserSettings
  exchange-rate.ts              # fetchRateForCurrency(currency) → number
  utils.ts                      # formatCurrency, cn(), date helpers

hooks/
  use-month.ts                  # Current month context + switcher
  use-exchange-rate.ts          # Client-side rate fetch hook

public/
  manifest.json                 # PWA manifest
  sw.js                         # Service worker (offline cache + push)
  icons/                        # PWA icons (192, 512)

middleware.ts                   # Protect (app) routes, redirect to /login
drizzle.config.ts               # Drizzle Kit config
tailwind.config.ts              # Bold Gradient theme extension
```

---

## Phase 1 — Scaffold & Infrastructure (MVP)

### Task 1: Create Next.js app + install dependencies

**Files:**
- Create: project root (via `create-next-app`)
- Modify: `package.json`, `tailwind.config.ts`, `app/globals.css`

- [ ] **Step 1: Scaffold the project**

```bash
cd /Users/luisobregon/projects/personal_projects/EasyBudget
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir=false \
  --import-alias="@/*"
```
When prompted, accept all defaults.

- [ ] **Step 2: Install core dependencies**

```bash
npm install drizzle-orm @neondatabase/serverless
npm install -D drizzle-kit dotenv-cli
npm install next-auth@beta @auth/drizzle-adapter
npm install web-push
npm install @types/web-push --save-dev
npm install lucide-react class-variance-authority clsx tailwind-merge
```

- [ ] **Step 3: Initialize shadcn/ui**

```bash
npx shadcn@latest init
```
When prompted:
- Style: **Default**
- Base color: **Slate** (we'll override with custom theme)
- CSS variables: **Yes**

- [ ] **Step 4: Add shadcn components we'll need**

```bash
npx shadcn@latest add button card badge input label select sheet dialog tabs progress
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js 15 app with shadcn/ui and core dependencies"
```

---

### Task 2: Bold Gradient theme

**Files:**
- Modify: `tailwind.config.ts`
- Modify: `app/globals.css`

- [ ] **Step 1: Extend Tailwind with Bold Gradient palette**

Replace the contents of `tailwind.config.ts`:

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          base: "#0d0d1a",
          deep: "#1e0a3c",
          mid:  "#2d1060",
          card: "#1e1b4b",
        },
        accent: {
          gold:  "#f59e0b",
          pink:  "#ec4899",
          purple: "#a78bfa",
          "purple-light": "#c4b5fd",
        },
        muted: {
          DEFAULT: "#7c6da0",
          light:   "#94a3b8",
        },
      },
      backgroundImage: {
        "gradient-brand": "linear-gradient(135deg, #f59e0b, #ec4899)",
        "gradient-app":   "linear-gradient(135deg, #1e0a3c 0%, #2d1060 50%, #1e1b4b 100%)",
        "gradient-card":  "linear-gradient(135deg, rgba(245,158,11,0.12), rgba(236,72,153,0.12))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
```

- [ ] **Step 2: Set global CSS variables + base styles**

Replace `app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 240 10% 7%;
    --foreground: 220 20% 90%;
    --card: 260 40% 12%;
    --card-foreground: 220 20% 90%;
    --popover: 260 40% 10%;
    --popover-foreground: 220 20% 90%;
    --primary: 38 92% 50%;
    --primary-foreground: 0 0% 100%;
    --secondary: 270 60% 30%;
    --secondary-foreground: 220 20% 90%;
    --muted: 270 30% 25%;
    --muted-foreground: 270 15% 55%;
    --accent: 320 80% 60%;
    --accent-foreground: 0 0% 100%;
    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 100%;
    --border: 270 30% 20%;
    --input: 270 30% 20%;
    --ring: 38 92% 50%;
    --radius: 0.75rem;
  }
}

@layer base {
  * { @apply border-border; }
  body {
    @apply bg-bg-base text-foreground;
    font-feature-settings: "rlig" 1, "calt" 1;
  }
}

.gradient-text {
  background: linear-gradient(90deg, #f59e0b, #ec4899);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

- [ ] **Step 3: Commit**

```bash
git add tailwind.config.ts app/globals.css
git commit -m "feat: add Bold Gradient theme to Tailwind + CSS variables"
```

---

### Task 3: Database schema + Drizzle setup

**Files:**
- Create: `lib/db/schema.ts`
- Create: `lib/db/index.ts`
- Create: `drizzle.config.ts`

- [ ] **Step 1: Create Drizzle config**

Create `drizzle.config.ts`:

```ts
import type { Config } from "drizzle-kit";

export default {
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
```

- [ ] **Step 2: Write the full schema**

Create `lib/db/schema.ts`:

```ts
import {
  pgTable, text, integer, real, boolean,
  timestamp, date, primaryKey, serial, index
} from "drizzle-orm/pg-core";
import type { AdapterAccount } from "@auth/core/adapters";

// ── Auth.js required tables ──────────────────────────────────────────────────

export const users = pgTable("users", {
  id:            text("id").notNull().primaryKey(),
  name:          text("name"),
  email:         text("email").notNull(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image:         text("image"),
});

export const accounts = pgTable("accounts", {
  userId:            text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type:              text("type").$type<AdapterAccount["type"]>().notNull(),
  provider:          text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  refresh_token:     text("refresh_token"),
  access_token:      text("access_token"),
  expires_at:        integer("expires_at"),
  token_type:        text("token_type"),
  scope:             text("scope"),
  id_token:          text("id_token"),
  session_state:     text("session_state"),
}, (t) => ({
  pk: primaryKey({ columns: [t.provider, t.providerAccountId] }),
}));

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").notNull().primaryKey(),
  userId:       text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires:      timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable("verification_tokens", {
  identifier: text("identifier").notNull(),
  token:      text("token").notNull(),
  expires:    timestamp("expires", { mode: "date" }).notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.identifier, t.token] }),
}));

// ── App tables ───────────────────────────────────────────────────────────────

export const userSettings = pgTable("user_settings", {
  userId:          text("user_id").notNull().primaryKey().references(() => users.id, { onDelete: "cascade" }),
  defaultSavingsPct: integer("default_savings_pct").notNull().default(20),
  defaultWantsPct:   integer("default_wants_pct").notNull().default(10),
  defaultBillsPct:   integer("default_bills_pct").notNull().default(70),
});

export const months = pgTable("months", {
  id:             serial("id").primaryKey(),
  userId:         text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  year:           integer("year").notNull(),
  month:          integer("month").notNull(), // 1–12
  income:         real("income").notNull().default(0),
  openingBalance: real("opening_balance").notNull().default(0),
  savingsPct:     integer("savings_pct").notNull().default(20),
  wantsPct:       integer("wants_pct").notNull().default(10),
  billsPct:       integer("bills_pct").notNull().default(70),
}, (t) => ({
  uniq: index("months_user_year_month_idx").on(t.userId, t.year, t.month),
}));

export const tags = pgTable("tags", {
  id:            serial("id").primaryKey(),
  userId:        text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name:          text("name").notNull(),
  emoji:         text("emoji").notNull().default("🏷️"),
  color:         text("color").notNull().default("#a78bfa"),
  defaultBucket: text("default_bucket").$type<"savings" | "bills" | "wants">().notNull().default("wants"),
});

export const trips = pgTable("trips", {
  id:              serial("id").primaryKey(),
  userId:          text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name:            text("name").notNull(),
  destination:     text("destination").notNull(),
  startDate:       date("start_date").notNull(),
  endDate:         date("end_date").notNull(),
  budgetUsd:       real("budget_usd").notNull(),
  primaryCurrency: text("primary_currency").notNull().default("USD"),
});

export const expenses = pgTable("expenses", {
  id:            serial("id").primaryKey(),
  userId:        text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  monthId:       integer("month_id").notNull().references(() => months.id, { onDelete: "cascade" }),
  amount:        real("amount").notNull(),
  currency:      text("currency").notNull().default("USD"),
  amountUsd:     real("amount_usd").notNull(),
  exchangeRate:  real("exchange_rate").notNull().default(1),
  description:   text("description").notNull(),
  date:          date("date").notNull(),
  paymentMethod: text("payment_method").$type<"cash" | "debit" | "credit_card">().notNull(),
  bucket:        text("bucket").$type<"savings" | "bills" | "wants">().notNull(),
  tagId:         integer("tag_id").references(() => tags.id, { onDelete: "set null" }),
  tripId:        integer("trip_id").references(() => trips.id, { onDelete: "set null" }),
  createdAt:     timestamp("created_at").notNull().defaultNow(),
});

export const bills = pgTable("bills", {
  id:                serial("id").primaryKey(),
  userId:            text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name:              text("name").notNull(),
  amount:            real("amount").notNull(),
  dueDay:            integer("due_day").notNull(), // 1–31
  type:              text("type").$type<"utility" | "subscription" | "credit_card" | "loan" | "other">().notNull(),
  reminderDaysBefore: integer("reminder_days_before").notNull().default(3),
  active:            boolean("active").notNull().default(true),
});
```

- [ ] **Step 3: Create db client**

Create `lib/db/index.ts`:

```ts
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Plain lazy function — safe at build time, safe with Auth.js adapter
// Do NOT use a Proxy wrapper here; Auth.js inspects adapter methods and a Proxy breaks that.
let _db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (!_db) {
    const sql = neon(process.env.DATABASE_URL!);
    _db = drizzle(sql, { schema });
  }
  return _db;
}

export * from "./schema";
```

- [ ] **Step 4: Provision Neon Postgres via Vercel Marketplace**

```bash
# One-command provisioning — creates Neon account, database, and injects env vars into your Vercel project
vercel integration add neon
```

Follow the prompts (browser will open). When done, pull env vars locally:

```bash
vercel env pull .env.local --yes
```

Verify `.env.local` contains `DATABASE_URL` (and optionally `DATABASE_URL_UNPOOLED`).

- [ ] **Step 5: Generate and run migration**

`drizzle-kit` does not auto-load `.env.local` — use `dotenv-cli`:

```bash
npx dotenv -e .env.local -- npx drizzle-kit push
```

Expected output: all tables created in Neon with no errors.

- [ ] **Step 6: Commit**

```bash
git add lib/db/ drizzle.config.ts
git commit -m "feat: add Drizzle schema and Neon Postgres connection"
```

---

### Task 4: Auth.js v5 setup

**Files:**
- Create: `lib/auth/config.ts`
- Create: `lib/auth/session.ts`
- Create: `app/api/auth/[...nextauth]/route.ts`
- Create: `middleware.ts`
- Create: `app/(auth)/login/page.tsx`

- [ ] **Step 1: Create Auth.js config**

Create `lib/auth/config.ts`:

```ts
import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { getDb, users } from "@/lib/db";
import { eq } from "drizzle-orm";

export const { handlers, signIn, signOut, auth } = NextAuth({
  // Use getDb() directly — never pass the Proxy wrapper to Auth.js adapters
  adapter: DrizzleAdapter(getDb()),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      credentials: {
        email:    { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize({ email }) {
        // For MVP: allow any email (no password hashing yet — add bcrypt in hardening phase)
        if (!email) return null;
        const db = getDb();
        const existing = await db.select().from(users).where(eq(users.email, email as string)).limit(1);
        return existing[0] ?? null;
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: { strategy: "database" },
});
```

- [ ] **Step 2: Create session helper**

Create `lib/auth/session.ts`:

```ts
import { auth } from "./config";
import { redirect } from "next/navigation";

export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user;
}
```

- [ ] **Step 3: Create Auth.js API route**

Create `app/api/auth/[...nextauth]/route.ts`:

```ts
import { handlers } from "@/lib/auth/config";
export const { GET, POST } = handlers;
```

- [ ] **Step 4: Create middleware to protect app routes**

Create `middleware.ts`:

```ts
import { auth } from "@/lib/auth/config";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isAuthRoute = req.nextUrl.pathname.startsWith("/login");

  if (!isLoggedIn && !isAuthRoute) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (isLoggedIn && isAuthRoute) {
    return NextResponse.redirect(new URL("/", req.url));
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|icons|manifest.json|sw.js|favicon.ico).*)"],
};
```

- [ ] **Step 5: Create login page**

Create `app/(auth)/login/page.tsx`:

```tsx
import { signIn } from "@/lib/auth/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-app flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="gradient-text text-3xl font-black tracking-widest">EASYBUDGET</h1>
          <p className="text-muted mt-2 text-sm">Sign in to your budget</p>
        </div>

        <form
          action={async (formData: FormData) => {
            "use server";
            await signIn("credentials", {
              email: formData.get("email"),
              password: formData.get("password"),
              redirectTo: "/",
            });
          }}
          className="space-y-4"
        >
          <div className="space-y-1">
            <Label htmlFor="email" className="text-muted-light text-xs uppercase tracking-wide">Email</Label>
            <Input id="email" name="email" type="email" required
              className="bg-bg-deep border-accent-purple/20 text-foreground" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password" className="text-muted-light text-xs uppercase tracking-wide">Password</Label>
            <Input id="password" name="password" type="password"
              className="bg-bg-deep border-accent-purple/20 text-foreground" />
          </div>
          <Button type="submit" className="w-full bg-gradient-brand text-white font-bold">
            Sign In
          </Button>
        </form>

        <form action={async () => { "use server"; await signIn("google", { redirectTo: "/" }); }}>
          <Button variant="outline" className="w-full border-accent-purple/30 text-accent-purple">
            Continue with Google
          </Button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Add env vars for Auth.js**

Add to `.env.local`:

```
AUTH_SECRET=<run: npx auth secret>
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
```

Generate secret:
```bash
npx auth secret
```

- [ ] **Step 7: Commit**

```bash
git add lib/auth/ app/api/ app/\(auth\)/ middleware.ts
git commit -m "feat: add Auth.js v5 with Google + credentials providers"
```

---

### Task 5: PWA manifest + service worker

**Files:**
- Create: `public/manifest.json`
- Create: `public/sw.js`
- Create: `components/pwa-register.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Create PWA manifest**

Create `public/manifest.json`:

```json
{
  "name": "EasyBudget",
  "short_name": "EasyBudget",
  "description": "Track your income, bills, and spending habits",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0d0d1a",
  "theme_color": "#f59e0b",
  "orientation": "portrait-primary",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

- [ ] **Step 2: Create placeholder icons**

```bash
mkdir -p public/icons
# Download placeholder icons (replace with real ones before launch)
curl -o public/icons/icon-192.png "https://via.placeholder.com/192/1e0a3c/f59e0b?text=EB"
curl -o public/icons/icon-512.png "https://via.placeholder.com/512/1e0a3c/f59e0b?text=EB"
```

- [ ] **Step 3: Create minimal service worker**

Create `public/sw.js`:

```js
const CACHE = "easybudget-v1";
const SHELL = ["/", "/manifest.json", "/icons/icon-192.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then((cached) => cached ?? fetch(e.request))
  );
});
```

- [ ] **Step 4: Create PWA register client component**

Create `components/pwa-register.tsx`:

```tsx
"use client";
import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js");
    }
  }, []);
  return null;
}
```

- [ ] **Step 5: Update root layout**

Create `app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { PwaRegister } from "@/components/pwa-register";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "EasyBudget",
  description: "Track your income, bills, and spending habits",
  manifest: "/manifest.json",
  themeColor: "#f59e0b",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "EasyBudget" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head />
      <body className={inter.className}>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add public/ components/pwa-register.tsx app/layout.tsx
git commit -m "feat: add PWA manifest and service worker"
```

---

## Phase 2 — App Shell & Navigation (MVP)

### Task 6: Responsive app shell

**Files:**
- Create: `components/layout/sidebar.tsx`
- Create: `components/layout/bottom-nav.tsx`
- Create: `app/(app)/layout.tsx`

- [ ] **Step 1: Create sidebar component**

Create `components/layout/sidebar.tsx`:

```tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BarChart2, Receipt, Plane, Tag, Target, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/",        label: "Overview",  icon: Home },
  { href: "/trends",  label: "Trends",    icon: BarChart2 },
  { href: "/bills",   label: "Bills",     icon: Receipt },
  { href: "/trips",   label: "Trips",     icon: Plane },
  { href: "/tags",    label: "Tags",      icon: Tag },
  { href: "/goals",   label: "Goals",     icon: Target },
];

export function Sidebar() {
  const path = usePathname();
  return (
    <nav className="hidden md:flex flex-col w-48 bg-bg-deep/70 border-r border-accent-purple/10 p-4 gap-1">
      <span className="gradient-text font-black text-lg tracking-widest px-2 pb-4 mb-2 border-b border-accent-purple/10">
        EASYBUDGET
      </span>
      {NAV.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors",
            path === href
              ? "bg-gradient-card border border-accent-gold/25 text-accent-gold"
              : "text-muted hover:text-foreground hover:bg-white/5"
          )}>
          <Icon size={16} />
          {label}
        </Link>
      ))}
      <div className="flex-1" />
      <Link href="/settings"
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted hover:text-foreground hover:bg-white/5">
        <Settings size={16} /> Settings
      </Link>
    </nav>
  );
}
```

- [ ] **Step 2: Create bottom nav component**

Create `components/layout/bottom-nav.tsx`:

```tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BarChart2, Plane, Target, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/",       label: "Home",   icon: Home },
  { href: "/trends", label: "Trends", icon: BarChart2 },
  { href: "/trips",  label: "Trips",  icon: Plane },
  { href: "/goals",  label: "Goals",  icon: Target },
  { href: "/bills",  label: "More",   icon: MoreHorizontal },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-bg-deep/90 border-t border-accent-purple/10 flex justify-around py-2 pb-safe z-50">
      {NAV.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href}
          className={cn(
            "flex flex-col items-center gap-1 px-3 py-1",
            path === href ? "text-accent-gold" : "text-muted"
          )}>
          <Icon size={20} />
          <span className="text-[9px] uppercase tracking-wide">{label}</span>
        </Link>
      ))}
    </nav>
  );
}
```

- [ ] **Step 3: Create app layout with shell**

Create `app/(app)/layout.tsx`:

```tsx
import { requireSession } from "@/lib/auth/session";
import { Sidebar } from "@/components/layout/sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { PlusCircle } from "lucide-react";
import Link from "next/link";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireSession();
  return (
    <div className="min-h-screen bg-gradient-app flex">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        {children}
      </main>
      <BottomNav />
      <Link href="/expenses/new"
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50
          w-13 h-13 rounded-2xl bg-gradient-brand flex items-center justify-center
          shadow-lg shadow-accent-gold/30 text-white">
        <PlusCircle size={26} />
      </Link>
    </div>
  );
}
```

- [ ] **Step 4: Create lib/utils.ts if not already present**

Create `lib/utils.ts`:

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

export function formatMonth(year: number, month: number) {
  return new Date(year, month - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function currentYearMonth() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}
```

- [ ] **Step 5: Commit**

```bash
git add components/layout/ app/\(app\)/ lib/utils.ts
git commit -m "feat: add responsive app shell with sidebar and bottom nav"
```

---

## Phase 3 — Home Dashboard (MVP)

### Task 7: Server actions for months + seed tags

**Files:**
- Create: `lib/actions/months.ts`
- Create: `lib/actions/tags.ts`

- [ ] **Step 1: Create month server actions**

Create `lib/actions/months.ts`:

```ts
"use server";
import { getDb, months, userSettings } from "@/lib/db";
import { and, eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";

export async function getOrCreateMonth(year: number, month: number) {
  const user = await requireSession();
  const db = getDb();
  const existing = await db.select().from(months)
    .where(and(eq(months.userId, user.id!), eq(months.year, year), eq(months.month, month)))
    .limit(1);

  if (existing[0]) return existing[0];

  const settings = await db.select().from(userSettings).where(eq(userSettings.userId, user.id!)).limit(1);
  const defaults = settings[0] ?? { defaultSavingsPct: 20, defaultWantsPct: 10, defaultBillsPct: 70 };

  const [created] = await db.insert(months).values({
    userId: user.id!,
    year,
    month,
    savingsPct: defaults.defaultSavingsPct,
    wantsPct:   defaults.defaultWantsPct,
    billsPct:   defaults.defaultBillsPct,
  }).returning();

  return created;
}

export async function updateMonthIncome(monthId: number, income: number, openingBalance: number) {
  const user = await requireSession();
  const db = getDb();
  await db.update(months)
    .set({ income, openingBalance })
    .where(and(eq(months.id, monthId), eq(months.userId, user.id!)));
}

export async function updateMonthAllocation(monthId: number, savingsPct: number, wantsPct: number, billsPct: number) {
  const user = await requireSession();
  const db = getDb();
  await db.update(months)
    .set({ savingsPct, wantsPct, billsPct })
    .where(and(eq(months.id, monthId), eq(months.userId, user.id!)));
}
```

- [ ] **Step 2: Create tags server actions with seed**

Create `lib/actions/tags.ts`:

```ts
"use server";
import { getDb, tags } from "@/lib/db";
import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";

const DEFAULT_TAGS = [
  { name: "Food",          emoji: "🍕", color: "#f59e0b", defaultBucket: "wants"   as const },
  { name: "Housing",       emoji: "🏠", color: "#a78bfa", defaultBucket: "bills"   as const },
  { name: "Utilities",     emoji: "💡", color: "#60a5fa", defaultBucket: "bills"   as const },
  { name: "Subscriptions", emoji: "📺", color: "#ec4899", defaultBucket: "bills"   as const },
  { name: "Transport",     emoji: "🚗", color: "#34d399", defaultBucket: "wants"   as const },
  { name: "Clothes",       emoji: "👗", color: "#f472b6", defaultBucket: "wants"   as const },
  { name: "Night Out",     emoji: "🎉", color: "#818cf8", defaultBucket: "wants"   as const },
  { name: "Family",        emoji: "👨‍👩‍👧", color: "#fbbf24", defaultBucket: "wants" as const },
  { name: "Health",        emoji: "💪", color: "#4ade80", defaultBucket: "wants"   as const },
  { name: "Travel",        emoji: "✈️", color: "#38bdf8", defaultBucket: "wants"   as const },
  { name: "Savings",       emoji: "💰", color: "#fbbf24", defaultBucket: "savings" as const },
  { name: "Other",         emoji: "📦", color: "#94a3b8", defaultBucket: "wants"   as const },
];

export async function getUserTags() {
  const user = await requireSession();
  const db = getDb();
  return db.select().from(tags).where(eq(tags.userId, user.id!));
}

export async function seedDefaultTags() {
  const user = await requireSession();
  const db = getDb();
  const existing = await db.select().from(tags).where(eq(tags.userId, user.id!));
  if (existing.length > 0) return;
  await db.insert(tags).values(DEFAULT_TAGS.map((t) => ({ ...t, userId: user.id! })));
}

export async function createTag(data: { name: string; emoji: string; color: string; defaultBucket: "savings" | "bills" | "wants" }) {
  const user = await requireSession();
  const db = getDb();
  const [tag] = await db.insert(tags).values({ ...data, userId: user.id! }).returning();
  return tag;
}

export async function deleteTag(tagId: number) {
  const user = await requireSession();
  const db = getDb();
  await db.delete(tags).where(and(eq(tags.id, tagId), eq(tags.userId, user.id!)));
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/actions/
git commit -m "feat: add month and tag server actions"
```

---

### Task 8: Home dashboard page

**Files:**
- Create: `app/(app)/page.tsx`
- Create: `components/dashboard/hero-card.tsx`
- Create: `components/dashboard/allocation-card.tsx`
- Create: `components/dashboard/expense-list.tsx`
- Create: `components/layout/month-switcher.tsx`
- Create: `lib/actions/expenses.ts` (read-only parts)

- [ ] **Step 1: Create expense read action**

Create `lib/actions/expenses.ts` (read actions only for now):

```ts
"use server";
import { getDb, expenses, tags, trips } from "@/lib/db";
import { and, eq, desc } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";

export async function getExpensesForMonth(monthId: number) {
  const user = await requireSession();
  const db = getDb();
  return db.select({
    id:            expenses.id,
    amount:        expenses.amount,
    currency:      expenses.currency,
    amountUsd:     expenses.amountUsd,
    description:   expenses.description,
    date:          expenses.date,
    paymentMethod: expenses.paymentMethod,
    bucket:        expenses.bucket,
    tagName:       tags.name,
    tagEmoji:      tags.emoji,
    tripName:      trips.name,
  })
  .from(expenses)
  .leftJoin(tags,  eq(expenses.tagId,  tags.id))
  .leftJoin(trips, eq(expenses.tripId, trips.id))
  .where(and(eq(expenses.monthId, monthId), eq(expenses.userId, user.id!)))
  .orderBy(desc(expenses.date));
}
```

- [ ] **Step 2: Create HeroCard component**

Create `components/dashboard/hero-card.tsx`:

```tsx
import { formatCurrency } from "@/lib/utils";

interface HeroCardProps {
  income: number;
  openingBalance: number;
  totalExpenses: number;
}

export function HeroCard({ income, openingBalance, totalExpenses }: HeroCardProps) {
  const closingBalance = openingBalance + income - totalExpenses;
  const pctUsed = income > 0 ? Math.min((totalExpenses / income) * 100, 100) : 0;
  const onTrack = pctUsed < 85;

  return (
    <div className="rounded-2xl bg-gradient-card border border-accent-gold/25 p-5">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-accent-purple-light text-[10px] uppercase tracking-widest mb-1">Total Income</p>
          <p className="gradient-text text-4xl font-black">{formatCurrency(income)}</p>
          <p className="text-muted text-xs mt-1">
            Opening: {formatCurrency(openingBalance)} · Closing: {formatCurrency(closingBalance)}
          </p>
        </div>
        <div className="text-right">
          <span className={`text-[10px] px-3 py-1 rounded-full font-semibold ${
            onTrack ? "bg-green-500/15 text-green-400 border border-green-500/30"
                    : "bg-red-500/15 text-red-400 border border-red-500/30"
          }`}>
            {onTrack ? "✓ On track" : "⚠ Over budget"}
          </span>
          <p className="text-foreground text-xl font-bold mt-2">{formatCurrency(closingBalance)}</p>
          <p className="text-muted text-[10px]">Cash left</p>
        </div>
      </div>
      <div className="mt-4">
        <div className="flex justify-between text-[10px] text-muted mb-1">
          <span>Spent: {formatCurrency(totalExpenses)}</span>
          <span>{pctUsed.toFixed(0)}% of income</span>
        </div>
        <div className="h-2 rounded-full bg-white/8 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-brand transition-all" style={{ width: `${pctUsed}%` }} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create AllocationCard component**

Create `components/dashboard/allocation-card.tsx`:

```tsx
import { formatCurrency } from "@/lib/utils";

type Bucket = "savings" | "bills" | "wants";

const STYLES: Record<Bucket, { bg: string; border: string; label: string; bar: string; icon: string }> = {
  savings: { bg: "bg-amber-500/10",   border: "border-amber-500/25",  label: "text-amber-400",  bar: "bg-amber-400",  icon: "💰" },
  bills:   { bg: "bg-pink-500/10",    border: "border-pink-500/25",   label: "text-pink-400",   bar: "bg-pink-400",   icon: "🏦" },
  wants:   { bg: "bg-violet-500/10",  border: "border-violet-500/25", label: "text-violet-400", bar: "bg-violet-400", icon: "✨" },
};

interface AllocationCardProps {
  bucket: Bucket;
  pct: number;
  income: number;
  spent: number;
}

export function AllocationCard({ bucket, pct, income, spent }: AllocationCardProps) {
  const allocated = income * (pct / 100);
  const remaining = allocated - spent;
  const fill = allocated > 0 ? Math.min((spent / allocated) * 100, 100) : 0;
  const s = STYLES[bucket];

  return (
    <div className={`rounded-2xl ${s.bg} border ${s.border} p-4`}>
      <div className="flex justify-between items-center mb-2">
        <span className="text-xl">{s.icon}</span>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${s.label} ${s.bg} border ${s.border}`}>
          {pct}% target
        </span>
      </div>
      <p className={`text-[10px] uppercase tracking-wider ${s.label} mb-1`}>{bucket}</p>
      <p className="text-foreground text-xl font-bold">{formatCurrency(allocated)}</p>
      <p className="text-muted text-[10px] mt-0.5">
        {formatCurrency(spent)} spent · {formatCurrency(Math.max(remaining, 0))} left
      </p>
      <div className="h-1 rounded-full bg-white/8 mt-3 overflow-hidden">
        <div className={`h-full rounded-full ${s.bar}`} style={{ width: `${fill}%` }} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create ExpenseList component**

Create `components/dashboard/expense-list.tsx`:

```tsx
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

type Expense = {
  id: number;
  description: string;
  amountUsd: number;
  currency: string;
  amount: number;
  date: string;
  tagEmoji: string | null;
  tagName: string | null;
  paymentMethod: string;
};

export function ExpenseList({ expenses }: { expenses: Expense[] }) {
  const METHOD_LABEL: Record<string, string> = {
    cash: "💵", debit: "💳", credit_card: "💳 CC",
  };
  return (
    <div className="rounded-2xl bg-white/3 border border-accent-purple/10 p-5">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-accent-purple-light text-[10px] uppercase tracking-widest font-semibold">Recent Expenses</h3>
        <Link href="/expenses" className="text-muted text-xs hover:text-foreground">View all →</Link>
      </div>
      {expenses.length === 0 && (
        <p className="text-muted text-sm text-center py-6">No expenses yet this month</p>
      )}
      {expenses.slice(0, 8).map((e) => (
        <div key={e.id} className="flex justify-between items-center py-2.5 border-b border-white/5 last:border-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/6 flex items-center justify-center text-sm">
              {e.tagEmoji ?? "📦"}
            </div>
            <div>
              <p className="text-foreground text-sm font-medium">{e.description}</p>
              <p className="text-muted text-[10px]">{e.tagName ?? "Uncategorized"} · {METHOD_LABEL[e.paymentMethod]}</p>
            </div>
          </div>
          <span className="text-red-400 text-sm font-semibold">-{formatCurrency(e.amountUsd)}</span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Create MonthSwitcher component**

Create `components/layout/month-switcher.tsx`:

```tsx
"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatMonth } from "@/lib/utils";

export function MonthSwitcher({ year, month }: { year: number; month: number }) {
  const router = useRouter();

  function go(delta: number) {
    let m = month + delta;
    let y = year;
    if (m < 1)  { m = 12; y--; }
    if (m > 12) { m = 1;  y++; }
    router.push(`/?year=${y}&month=${m}`);
  }

  return (
    <div className="flex items-center gap-3 bg-white/5 border border-accent-purple/15 rounded-xl px-4 py-2">
      <button onClick={() => go(-1)} className="text-muted hover:text-foreground"><ChevronLeft size={16} /></button>
      <span className="text-accent-purple-light text-sm font-semibold">{formatMonth(year, month)}</span>
      <button onClick={() => go(1)} className="text-muted hover:text-foreground"><ChevronRight size={16} /></button>
    </div>
  );
}
```

- [ ] **Step 6: Create home page**

Create `app/(app)/page.tsx`:

```tsx
import { requireSession } from "@/lib/auth/session";
import { getOrCreateMonth, seedDefaultTags } from "@/lib/actions/months";
import { getExpensesForMonth } from "@/lib/actions/expenses";
import { currentYearMonth } from "@/lib/utils";
import { HeroCard } from "@/components/dashboard/hero-card";
import { AllocationCard } from "@/components/dashboard/allocation-card";
import { ExpenseList } from "@/components/dashboard/expense-list";
import { MonthSwitcher } from "@/components/layout/month-switcher";
```

Wait — `seedDefaultTags` is in `lib/actions/tags.ts`, not months. Fix import:

```tsx
import { requireSession } from "@/lib/auth/session";
import { getOrCreateMonth } from "@/lib/actions/months";
import { seedDefaultTags } from "@/lib/actions/tags";
import { getExpensesForMonth } from "@/lib/actions/expenses";
import { currentYearMonth } from "@/lib/utils";
import { HeroCard } from "@/components/dashboard/hero-card";
import { AllocationCard } from "@/components/dashboard/allocation-card";
import { ExpenseList } from "@/components/dashboard/expense-list";
import { MonthSwitcher } from "@/components/layout/month-switcher";

export default async function HomePage({
  searchParams,
}: {
  searchParams: { year?: string; month?: string };
}) {
  await requireSession();
  await seedDefaultTags();

  const def = currentYearMonth();
  const year  = parseInt(searchParams.year  ?? String(def.year));
  const month = parseInt(searchParams.month ?? String(def.month));

  const monthData = await getOrCreateMonth(year, month);
  const expenseRows = await getExpensesForMonth(monthData.id);

  const totalExpenses = expenseRows.reduce((sum, e) => sum + e.amountUsd, 0);
  const byBucket = (bucket: string) =>
    expenseRows.filter((e) => e.bucket === bucket).reduce((s, e) => s + e.amountUsd, 0);

  return (
    <div className="p-4 md:p-7 space-y-5">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-foreground text-xl font-bold">Overview</h2>
          <p className="text-muted text-sm">Your month at a glance</p>
        </div>
        <MonthSwitcher year={year} month={month} />
      </div>

      <HeroCard
        income={monthData.income}
        openingBalance={monthData.openingBalance}
        totalExpenses={totalExpenses}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <AllocationCard bucket="savings" pct={monthData.savingsPct} income={monthData.income} spent={byBucket("savings")} />
        <AllocationCard bucket="bills"   pct={monthData.billsPct}   income={monthData.income} spent={byBucket("bills")} />
        <AllocationCard bucket="wants"   pct={monthData.wantsPct}   income={monthData.income} spent={byBucket("wants")} />
      </div>

      <ExpenseList expenses={expenseRows as any} />
    </div>
  );
}
```

- [ ] **Step 7: Start dev server and verify home page renders**

```bash
npm run dev
```

Open `http://localhost:3000`. Expected:
- Redirects to `/login` if not authenticated
- After sign-in: shows home dashboard with hero card, 3 allocation cards, empty expense list
- On narrow viewport: bottom nav visible, no sidebar
- On wide viewport: sidebar visible, no bottom nav

- [ ] **Step 8: Commit**

```bash
git add app/\(app\)/ components/dashboard/ components/layout/month-switcher.tsx lib/actions/
git commit -m "feat: add home dashboard with hero card, allocation cards, expense list"
```

---

## Phase 4 — Expense Entry (MVP)

### Task 9: Exchange rate API route

**Files:**
- Create: `lib/exchange-rate.ts`
- Create: `app/api/exchange-rate/route.ts`

- [ ] **Step 1: Create exchange rate fetcher**

Create `lib/exchange-rate.ts`:

```ts
// Uses open.er-api.com free tier — no API key required
const BASE_URL = "https://open.er-api.com/v6/latest/USD";

let cache: { rates: Record<string, number>; fetchedAt: number } | null = null;

export async function fetchRatesUsd(): Promise<Record<string, number>> {
  if (cache && Date.now() - cache.fetchedAt < 3_600_000) return cache.rates;
  const res = await fetch(BASE_URL, { next: { revalidate: 3600 } });
  const data = await res.json();
  cache = { rates: data.rates, fetchedAt: Date.now() };
  return data.rates;
}

export async function fetchRateForCurrency(currency: string): Promise<number> {
  if (currency === "USD") return 1;
  const rates = await fetchRatesUsd();
  return rates[currency] ?? 1;
}

export async function convertToUsd(amount: number, currency: string): Promise<{ amountUsd: number; rate: number }> {
  const rate = await fetchRateForCurrency(currency);
  return { amountUsd: amount / rate, rate };
}
```

- [ ] **Step 2: Create API route for client-side rate fetching**

Create `app/api/exchange-rate/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { fetchRateForCurrency } from "@/lib/exchange-rate";
import { auth } from "@/lib/auth/config";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const currency = req.nextUrl.searchParams.get("currency") ?? "USD";
  const rate = await fetchRateForCurrency(currency);
  return NextResponse.json({ currency, rate });
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/exchange-rate.ts app/api/exchange-rate/
git commit -m "feat: add exchange rate fetcher with hourly cache"
```

---

### Task 10: Add expense form

**Files:**
- Create: `lib/actions/expenses.ts` (add write actions)
- Create: `components/expenses/expense-form.tsx`
- Create: `components/expenses/payment-method-picker.tsx`
- Create: `components/expenses/currency-picker.tsx`
- Create: `components/expenses/tag-picker.tsx`
- Create: `app/(app)/expenses/new/page.tsx`

- [ ] **Step 1: Add createExpense server action to expenses.ts**

Add to `lib/actions/expenses.ts`:

```ts
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { convertToUsd } from "@/lib/exchange-rate";
import { getDb, months } from "@/lib/db";

export async function createExpense(formData: FormData) {
  "use server";
  const user = await requireSession();
  const db = getDb();

  const year  = parseInt(formData.get("year")  as string);
  const month = parseInt(formData.get("month") as string);

  let monthRow = await db.select().from(months)
    .where(and(eq(months.userId, user.id!), eq(months.year, year), eq(months.month, month)))
    .limit(1);

  if (!monthRow[0]) {
    const [created] = await db.insert(months).values({ userId: user.id!, year, month }).returning();
    monthRow = [created];
  }

  const currency = (formData.get("currency") as string) || "USD";
  const amount   = parseFloat(formData.get("amount") as string);
  const { amountUsd, rate } = await convertToUsd(amount, currency);

  await db.insert(expenses).values({
    userId:        user.id!,
    monthId:       monthRow[0].id,
    amount,
    currency,
    amountUsd,
    exchangeRate:  rate,
    description:   formData.get("description") as string,
    date:          formData.get("date") as string,
    paymentMethod: formData.get("paymentMethod") as "cash" | "debit" | "credit_card",
    bucket:        formData.get("bucket") as "savings" | "bills" | "wants",
    tagId:         formData.get("tagId") ? parseInt(formData.get("tagId") as string) : null,
    tripId:        formData.get("tripId") ? parseInt(formData.get("tripId") as string) : null,
  });

  revalidatePath("/");
  redirect("/");
}

export async function deleteExpense(expenseId: number) {
  "use server";
  const user = await requireSession();
  const db = getDb();
  await db.delete(expenses).where(and(eq(expenses.id, expenseId), eq(expenses.userId, user.id!)));
  revalidatePath("/");
}
```

- [ ] **Step 2: Create PaymentMethodPicker**

Create `components/expenses/payment-method-picker.tsx`:

```tsx
"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";

type Method = "cash" | "debit" | "credit_card";

const OPTIONS: { value: Method; label: string; icon: string; note?: string }[] = [
  { value: "cash",        label: "Cash",        icon: "💵" },
  { value: "debit",       label: "Debit Card",  icon: "💳" },
  { value: "credit_card", label: "Credit Card", icon: "💳",
    note: "Logged now against your budget. The CC bill at month-end is just a payment — no double-counting." },
];

export function PaymentMethodPicker({ defaultValue = "debit" }: { defaultValue?: Method }) {
  const [selected, setSelected] = useState<Method>(defaultValue);
  const note = OPTIONS.find((o) => o.value === selected)?.note;

  return (
    <div className="space-y-2">
      <input type="hidden" name="paymentMethod" value={selected} />
      <div className="flex gap-2 flex-wrap">
        {OPTIONS.map((o) => (
          <button key={o.value} type="button" onClick={() => setSelected(o.value)}
            className={cn(
              "px-4 py-2 rounded-full text-sm border transition-colors",
              selected === o.value
                ? o.value === "cash"
                  ? "bg-green-500/15 border-green-500/40 text-green-400"
                  : o.value === "credit_card"
                    ? "bg-pink-500/15 border-pink-500/40 text-pink-400"
                    : "bg-indigo-500/15 border-indigo-500/40 text-indigo-400"
                : "bg-white/4 border-accent-purple/20 text-muted hover:text-foreground"
            )}>
            {o.icon} {o.label}
          </button>
        ))}
      </div>
      {note && (
        <p className="text-[11px] text-accent-purple-light bg-pink-500/8 border border-pink-500/20 rounded-xl p-3 leading-relaxed">
          {note}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create CurrencyPicker**

Create `components/expenses/currency-picker.tsx`:

```tsx
"use client";
import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";

const CURRENCIES = ["USD", "NIO", "GTQ", "MXN", "EUR", "GBP", "CAD"];

export function CurrencyPicker({ defaultAmount = "" }: { defaultAmount?: string }) {
  const [currency, setCurrency] = useState("USD");
  const [amount, setAmount]     = useState(defaultAmount);
  const [rate, setRate]         = useState(1);
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    if (currency === "USD") { setRate(1); return; }
    setLoading(true);
    fetch(`/api/exchange-rate?currency=${currency}`)
      .then((r) => r.json())
      .then((d) => setRate(d.rate))
      .finally(() => setLoading(false));
  }, [currency]);

  const amountUsd = amount ? parseFloat(amount) / rate : 0;

  return (
    <div className="space-y-2">
      <input type="hidden" name="currency" value={currency} />
      <div className="flex gap-2">
        <select value={currency} onChange={(e) => setCurrency(e.target.value)}
          className="bg-violet-500/15 border border-violet-500/30 text-violet-300 rounded-xl px-3 py-2.5 text-sm font-semibold">
          {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input name="amount" type="number" step="0.01" min="0" required
          value={amount} onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className="flex-1 bg-bg-deep border border-accent-purple/20 text-foreground rounded-xl px-4 py-2.5 text-lg font-bold" />
      </div>
      {currency !== "USD" && amount && (
        <p className="text-muted text-[11px] pl-1">
          {loading ? "Fetching rate…" : `≈ ${formatCurrency(amountUsd)} USD · rate: ${rate.toFixed(4)}`}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create TagPicker**

Create `components/expenses/tag-picker.tsx`:

```tsx
"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";

type Tag = { id: number; name: string; emoji: string; defaultBucket: "savings" | "bills" | "wants" };

export function TagPicker({ tags, onBucketChange }: {
  tags: Tag[];
  onBucketChange?: (bucket: "savings" | "bills" | "wants") => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);

  function select(tag: Tag) {
    setSelected(tag.id);
    onBucketChange?.(tag.defaultBucket);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <input type="hidden" name="tagId" value={selected ?? ""} />
      {tags.map((tag) => (
        <button key={tag.id} type="button" onClick={() => select(tag)}
          className={cn(
            "px-3 py-1.5 rounded-full text-sm border transition-colors",
            selected === tag.id
              ? "bg-amber-500/15 border-amber-500/40 text-amber-400"
              : "bg-white/4 border-accent-purple/20 text-muted hover:text-foreground"
          )}>
          {tag.emoji} {tag.name}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Create Add Expense page**

Create `app/(app)/expenses/new/page.tsx`:

```tsx
import { requireSession } from "@/lib/auth/session";
import { getUserTags } from "@/lib/actions/tags";
import { createExpense } from "@/lib/actions/expenses";
import { currentYearMonth } from "@/lib/utils";
import { PaymentMethodPicker } from "@/components/expenses/payment-method-picker";
import { CurrencyPicker } from "@/components/expenses/currency-picker";
import { TagPickerWrapper } from "@/components/expenses/tag-picker-wrapper";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function NewExpensePage() {
  await requireSession();
  const tags = await getUserTags();
  const { year, month } = currentYearMonth();
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="p-4 md:p-7 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="text-muted hover:text-foreground"><ChevronLeft size={20} /></Link>
        <h2 className="text-foreground text-xl font-bold">Add Expense</h2>
      </div>

      <form action={createExpense} className="space-y-5">
        <input type="hidden" name="year"  value={year} />
        <input type="hidden" name="month" value={month} />

        <div className="space-y-1">
          <Label className="text-muted text-[10px] uppercase tracking-widest">Amount</Label>
          <CurrencyPicker />
        </div>

        <div className="space-y-1">
          <Label htmlFor="description" className="text-muted text-[10px] uppercase tracking-widest">Description</Label>
          <Input id="description" name="description" required placeholder="DoorDash — dinner"
            className="bg-bg-deep border-accent-purple/20 text-foreground" />
        </div>

        <div className="space-y-1">
          <Label htmlFor="date" className="text-muted text-[10px] uppercase tracking-widest">Date</Label>
          <Input id="date" name="date" type="date" required defaultValue={today}
            className="bg-bg-deep border-accent-purple/20 text-foreground" />
        </div>

        <div className="space-y-1">
          <Label className="text-muted text-[10px] uppercase tracking-widest">Category</Label>
          <TagPickerWrapper tags={tags} />
        </div>

        <div className="space-y-1">
          <Label className="text-muted text-[10px] uppercase tracking-widest">Paid with</Label>
          <PaymentMethodPicker />
        </div>

        <Button type="submit" className="w-full bg-gradient-brand text-white font-bold py-3 rounded-xl">
          Save Expense
        </Button>
      </form>
    </div>
  );
}
```

- [ ] **Step 6: Create TagPickerWrapper (client component that manages bucket state)**

Create `components/expenses/tag-picker-wrapper.tsx`:

```tsx
"use client";
import { useState } from "react";
import { TagPicker } from "./tag-picker";
import { cn } from "@/lib/utils";

type Tag = { id: number; name: string; emoji: string; defaultBucket: "savings" | "bills" | "wants" };
type Bucket = "savings" | "bills" | "wants";

const BUCKET_STYLES: Record<Bucket, string> = {
  savings: "bg-amber-500/15 border-amber-500/40 text-amber-400",
  bills:   "bg-pink-500/15 border-pink-500/40 text-pink-400",
  wants:   "bg-violet-500/15 border-violet-500/40 text-violet-400",
};

export function TagPickerWrapper({ tags }: { tags: Tag[] }) {
  const [bucket, setBucket] = useState<Bucket>("wants");

  return (
    <div className="space-y-3">
      <TagPicker tags={tags} onBucketChange={setBucket} />
      <div className="space-y-1">
        <p className="text-muted text-[10px] uppercase tracking-widest">Budget bucket</p>
        <div className="flex gap-2">
          {(["savings", "bills", "wants"] as Bucket[]).map((b) => (
            <button key={b} type="button" onClick={() => setBucket(b)}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm border capitalize transition-colors",
                bucket === b ? BUCKET_STYLES[b] : "bg-white/4 border-accent-purple/20 text-muted"
              )}>
              {b}
            </button>
          ))}
        </div>
        <input type="hidden" name="bucket" value={bucket} />
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Test expense creation**

```bash
npm run dev
```

1. Navigate to `http://localhost:3000/expenses/new`
2. Enter amount: 20, description: "DoorDash — dinner", tag: Food, payment: Credit Card
3. Submit — should redirect to `/` with expense showing in the list

- [ ] **Step 8: Commit**

```bash
git add app/\(app\)/expenses/ components/expenses/ lib/actions/expenses.ts lib/exchange-rate.ts app/api/exchange-rate/
git commit -m "feat: add expense entry form with payment method, tags, and multi-currency"
```

---

## Phase 5 — Bills & Reminders

### Task 11: Bills manager

**Files:**
- Create: `lib/actions/bills.ts`
- Create: `components/dashboard/upcoming-bills-strip.tsx`
- Create: `app/(app)/bills/page.tsx`
- Create: `app/(app)/bills/new/page.tsx`
- Modify: `app/(app)/page.tsx` — add upcoming bills strip

- [ ] **Step 1: Create bills server actions**

Create `lib/actions/bills.ts`:

```ts
"use server";
import { getDb, bills } from "@/lib/db";
import { and, eq, asc } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";

export async function getUserBills() {
  const user = await requireSession();
  const db = getDb();
  return db.select().from(bills).where(and(eq(bills.userId, user.id!), eq(bills.active, true))).orderBy(asc(bills.dueDay));
}

export async function getUpcomingBills(daysAhead = 7) {
  const user = await requireSession();
  const db = getDb();
  const today = new Date().getDate();
  const allBills = await db.select().from(bills).where(and(eq(bills.userId, user.id!), eq(bills.active, true)));
  return allBills.filter((b) => {
    const daysUntil = b.dueDay >= today ? b.dueDay - today : 31 - today + b.dueDay;
    return daysUntil <= daysAhead;
  });
}

export async function createBill(formData: FormData) {
  const user = await requireSession();
  const db = getDb();
  await db.insert(bills).values({
    userId:             user.id!,
    name:               formData.get("name") as string,
    amount:             parseFloat(formData.get("amount") as string),
    dueDay:             parseInt(formData.get("dueDay") as string),
    type:               formData.get("type") as "utility" | "subscription" | "credit_card" | "loan" | "other",
    reminderDaysBefore: parseInt(formData.get("reminderDaysBefore") as string || "3"),
  });
  revalidatePath("/bills");
  revalidatePath("/");
}

export async function deleteBill(billId: number) {
  const user = await requireSession();
  const db = getDb();
  await db.update(bills).set({ active: false }).where(and(eq(bills.id, billId), eq(bills.userId, user.id!)));
  revalidatePath("/bills");
  revalidatePath("/");
}
```

- [ ] **Step 2: Create UpcomingBillsStrip**

Create `components/dashboard/upcoming-bills-strip.tsx`:

```tsx
import { formatCurrency } from "@/lib/utils";

type Bill = { id: number; name: string; amount: number; dueDay: number; type: string };

const TYPE_ICON: Record<string, string> = {
  utility: "💡", subscription: "📺", credit_card: "💳", loan: "🏦", other: "📋",
};

export function UpcomingBillsStrip({ bills }: { bills: Bill[] }) {
  if (bills.length === 0) return null;
  const today = new Date().getDate();

  return (
    <div className="rounded-2xl bg-white/3 border border-accent-purple/10 p-5">
      <h3 className="text-accent-purple-light text-[10px] uppercase tracking-widest font-semibold mb-3">
        Due Soon
      </h3>
      <div className="space-y-2">
        {bills.map((b) => {
          const daysUntil = b.dueDay >= today ? b.dueDay - today : 31 - today + b.dueDay;
          return (
            <div key={b.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
              <div className="flex items-center gap-3">
                <span className="text-lg">{TYPE_ICON[b.type] ?? "📋"}</span>
                <div>
                  <p className="text-foreground text-sm font-medium">{b.name}</p>
                  <p className="text-muted text-[10px]">
                    Due {daysUntil === 0 ? "today" : `in ${daysUntil} day${daysUntil === 1 ? "" : "s"}`} (day {b.dueDay})
                  </p>
                </div>
              </div>
              <span className="text-amber-400 font-semibold text-sm">{formatCurrency(b.amount)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create bills list page**

Create `app/(app)/bills/page.tsx`:

```tsx
import { getUserBills, deleteBill } from "@/lib/actions/bills";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Trash2, Plus } from "lucide-react";

const TYPE_ICON: Record<string, string> = {
  utility: "💡", subscription: "📺", credit_card: "💳", loan: "🏦", other: "📋",
};

export default async function BillsPage() {
  const billsList = await getUserBills();

  return (
    <div className="p-4 md:p-7 space-y-5">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-foreground text-xl font-bold">Bills & Subscriptions</h2>
          <p className="text-muted text-sm">Recurring payments and reminders</p>
        </div>
        <Link href="/bills/new">
          <Button className="bg-gradient-brand text-white font-bold gap-2">
            <Plus size={16} /> Add Bill
          </Button>
        </Link>
      </div>

      <div className="rounded-2xl bg-white/3 border border-accent-purple/10 divide-y divide-white/5">
        {billsList.length === 0 && (
          <p className="text-muted text-sm text-center py-8">No bills yet. Add your first one.</p>
        )}
        {billsList.map((b) => (
          <div key={b.id} className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <span className="text-xl">{TYPE_ICON[b.type] ?? "📋"}</span>
              <div>
                <p className="text-foreground font-medium">{b.name}</p>
                <p className="text-muted text-xs">Due day {b.dueDay} · {b.reminderDaysBefore}d reminder</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-amber-400 font-bold">{formatCurrency(b.amount)}</span>
              <form action={async () => { "use server"; await deleteBill(b.id); }}>
                <button type="submit" className="text-muted hover:text-red-400 transition-colors">
                  <Trash2 size={15} />
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create add bill page**

Create `app/(app)/bills/new/page.tsx`:

```tsx
import { createBill } from "@/lib/actions/bills";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function NewBillPage() {
  return (
    <div className="p-4 md:p-7 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/bills" className="text-muted hover:text-foreground"><ChevronLeft size={20} /></Link>
        <h2 className="text-foreground text-xl font-bold">Add Bill</h2>
      </div>

      <form action={createBill} className="space-y-5">
        <div className="space-y-1">
          <Label className="text-muted text-[10px] uppercase tracking-widest">Name</Label>
          <Input name="name" required placeholder="Netflix" className="bg-bg-deep border-accent-purple/20 text-foreground" />
        </div>
        <div className="space-y-1">
          <Label className="text-muted text-[10px] uppercase tracking-widest">Amount (USD)</Label>
          <Input name="amount" type="number" step="0.01" min="0" required placeholder="30.00"
            className="bg-bg-deep border-accent-purple/20 text-foreground" />
        </div>
        <div className="space-y-1">
          <Label className="text-muted text-[10px] uppercase tracking-widest">Due Day of Month</Label>
          <Input name="dueDay" type="number" min="1" max="31" required placeholder="8"
            className="bg-bg-deep border-accent-purple/20 text-foreground" />
        </div>
        <div className="space-y-1">
          <Label className="text-muted text-[10px] uppercase tracking-widest">Type</Label>
          <select name="type" required
            className="w-full bg-bg-deep border border-accent-purple/20 text-foreground rounded-xl px-4 py-2.5">
            <option value="subscription">Subscription</option>
            <option value="utility">Utility</option>
            <option value="credit_card">Credit Card</option>
            <option value="loan">Loan</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-muted text-[10px] uppercase tracking-widest">Remind me (days before)</Label>
          <Input name="reminderDaysBefore" type="number" min="1" max="14" defaultValue="3"
            className="bg-bg-deep border-accent-purple/20 text-foreground" />
        </div>
        <Button type="submit" className="w-full bg-gradient-brand text-white font-bold py-3 rounded-xl">
          Save Bill
        </Button>
      </form>
    </div>
  );
}
```

- [ ] **Step 5: Add UpcomingBillsStrip to home page**

In `app/(app)/page.tsx`, add this import and fetch:

```tsx
import { getUpcomingBills } from "@/lib/actions/bills";
import { UpcomingBillsStrip } from "@/components/dashboard/upcoming-bills-strip";
```

Add inside the async function body (after `monthData`):

```tsx
const upcomingBills = await getUpcomingBills(7);
```

Add after the allocation cards grid, before `<ExpenseList>`:

```tsx
<UpcomingBillsStrip bills={upcomingBills} />
```

- [ ] **Step 6: Commit**

```bash
git add app/\(app\)/bills/ components/dashboard/upcoming-bills-strip.tsx lib/actions/bills.ts
git commit -m "feat: add bills manager with due-date reminders strip on home"
```

---

## Phase 6 — Trips

### Task 12: Trip budgets

**Files:**
- Create: `lib/actions/trips.ts`
- Create: `app/(app)/trips/page.tsx`
- Create: `app/(app)/trips/new/page.tsx`
- Create: `app/(app)/trips/[id]/page.tsx`

- [ ] **Step 1: Create trip server actions**

Create `lib/actions/trips.ts`:

```ts
"use server";
import { getDb, trips, expenses, tags } from "@/lib/db";
import { and, eq, desc, sum } from "drizzle-orm";
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
```

- [ ] **Step 2: Create trips list page**

Create `app/(app)/trips/page.tsx`:

```tsx
import { getUserTrips } from "@/lib/actions/trips";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, Plane } from "lucide-react";

export default async function TripsPage() {
  const tripsList = await getUserTrips();

  return (
    <div className="p-4 md:p-7 space-y-5">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-foreground text-xl font-bold">Trips</h2>
          <p className="text-muted text-sm">Plan and track travel budgets</p>
        </div>
        <Link href="/trips/new">
          <Button className="bg-gradient-brand text-white font-bold gap-2">
            <Plus size={16} /> New Trip
          </Button>
        </Link>
      </div>

      {tripsList.length === 0 && (
        <div className="rounded-2xl bg-white/3 border border-accent-purple/10 p-10 text-center">
          <Plane size={32} className="text-muted mx-auto mb-3" />
          <p className="text-muted text-sm">No trips yet. Plan your next adventure.</p>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {tripsList.map((t) => (
          <Link key={t.id} href={`/trips/${t.id}`}
            className="rounded-2xl bg-gradient-card border border-accent-gold/20 p-5 hover:border-accent-gold/40 transition-colors">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-foreground font-bold">{t.name}</p>
                <p className="text-muted text-xs">✈️ {t.destination}</p>
              </div>
              <span className="text-accent-gold font-bold text-lg">{formatCurrency(t.budgetUsd)}</span>
            </div>
            <p className="text-muted text-xs">{t.startDate} → {t.endDate}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create new trip page**

Create `app/(app)/trips/new/page.tsx`:

```tsx
import { createTrip } from "@/lib/actions/trips";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

const CURRENCIES = ["USD", "NIO", "GTQ", "MXN", "EUR", "GBP", "CAD"];

export default function NewTripPage() {
  return (
    <div className="p-4 md:p-7 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/trips" className="text-muted hover:text-foreground"><ChevronLeft size={20} /></Link>
        <h2 className="text-foreground text-xl font-bold">Plan a Trip</h2>
      </div>
      <form action={createTrip} className="space-y-5">
        <div className="space-y-1">
          <Label className="text-muted text-[10px] uppercase tracking-widest">Trip Name</Label>
          <Input name="name" required placeholder="Nicaragua — May 2026"
            className="bg-bg-deep border-accent-purple/20 text-foreground" />
        </div>
        <div className="space-y-1">
          <Label className="text-muted text-[10px] uppercase tracking-widest">Destination</Label>
          <Input name="destination" required placeholder="Managua, Nicaragua"
            className="bg-bg-deep border-accent-purple/20 text-foreground" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-muted text-[10px] uppercase tracking-widest">Start Date</Label>
            <Input name="startDate" type="date" required className="bg-bg-deep border-accent-purple/20 text-foreground" />
          </div>
          <div className="space-y-1">
            <Label className="text-muted text-[10px] uppercase tracking-widest">End Date</Label>
            <Input name="endDate" type="date" required className="bg-bg-deep border-accent-purple/20 text-foreground" />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-muted text-[10px] uppercase tracking-widest">Trip Budget (USD)</Label>
          <Input name="budgetUsd" type="number" step="0.01" min="0" required placeholder="800.00"
            className="bg-bg-deep border-accent-purple/20 text-foreground" />
        </div>
        <div className="space-y-1">
          <Label className="text-muted text-[10px] uppercase tracking-widest">Primary Local Currency</Label>
          <select name="primaryCurrency"
            className="w-full bg-bg-deep border border-accent-purple/20 text-foreground rounded-xl px-4 py-2.5">
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <Button type="submit" className="w-full bg-gradient-brand text-white font-bold py-3 rounded-xl">
          Create Trip
        </Button>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Create trip detail page**

Create `app/(app)/trips/[id]/page.tsx`:

```tsx
import { getTrip, getTripExpenses } from "@/lib/actions/trips";
import { formatCurrency } from "@/lib/utils";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function TripDetailPage({ params }: { params: { id: string } }) {
  const trip = await getTrip(parseInt(params.id));
  if (!trip) notFound();

  const expenseRows = await getTripExpenses(trip.id);
  const totalSpent = expenseRows.reduce((s, e) => s + e.amountUsd, 0);
  const remaining  = trip.budgetUsd - totalSpent;
  const pct = trip.budgetUsd > 0 ? Math.min((totalSpent / trip.budgetUsd) * 100, 100) : 0;

  return (
    <div className="p-4 md:p-7 space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/trips" className="text-muted hover:text-foreground"><ChevronLeft size={20} /></Link>
        <div>
          <h2 className="text-foreground text-xl font-bold">{trip.name}</h2>
          <p className="text-muted text-sm">✈️ {trip.destination} · {trip.startDate} → {trip.endDate}</p>
        </div>
      </div>

      <div className="rounded-2xl bg-gradient-card border border-accent-gold/25 p-5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-muted text-[10px] uppercase tracking-widest mb-1">Budget</p>
            <p className="gradient-text text-3xl font-black">{formatCurrency(trip.budgetUsd)}</p>
          </div>
          <div className="text-right">
            <p className={`text-lg font-bold ${remaining >= 0 ? "text-green-400" : "text-red-400"}`}>
              {formatCurrency(Math.abs(remaining))} {remaining >= 0 ? "left" : "over"}
            </p>
            <p className="text-muted text-xs">{formatCurrency(totalSpent)} spent</p>
          </div>
        </div>
        <div className="h-2 rounded-full bg-white/8 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-brand" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="rounded-2xl bg-white/3 border border-accent-purple/10 p-5">
        <h3 className="text-accent-purple-light text-[10px] uppercase tracking-widest font-semibold mb-4">Expenses</h3>
        {expenseRows.length === 0 && (
          <p className="text-muted text-sm text-center py-4">No expenses logged for this trip yet.</p>
        )}
        {expenseRows.map((e) => (
          <div key={e.id} className="flex justify-between items-center py-2.5 border-b border-white/5 last:border-0">
            <div className="flex items-center gap-3">
              <span className="text-lg">{e.tagEmoji ?? "📦"}</span>
              <div>
                <p className="text-foreground text-sm">{e.description}</p>
                <p className="text-muted text-[10px]">{e.date} · {e.tagName ?? "Uncategorized"}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-red-400 text-sm font-semibold">-{formatCurrency(e.amountUsd)}</p>
              {e.currency !== "USD" && (
                <p className="text-muted text-[10px]">{e.amount} {e.currency}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add app/\(app\)/trips/ lib/actions/trips.ts
git commit -m "feat: add trip budget planner with envelope tracking and foreign currency"
```

---

## Phase 7 — Deploy to Vercel

### Task 13: Production deployment

**Files:**
- Modify: `.gitignore`
- Create: `vercel.json` (if needed)

- [ ] **Step 1: Update .gitignore**

Add to `.gitignore`:

```
.env.local
.env*.local
.superpowers/
```

- [ ] **Step 2: Push to GitHub**

```bash
git add -A
git commit -m "chore: production ready — add gitignore"
git remote add origin <your-github-repo-url>
git push -u origin main
```

- [ ] **Step 3: Import project in Vercel**

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repo
3. Framework: **Next.js** (auto-detected)
4. Add environment variables from `.env.local`:
   - `AUTH_SECRET`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `POSTGRES_URL` and related (already added when you connected Vercel Postgres)
5. Click **Deploy**

- [ ] **Step 4: Verify deployment**

```bash
npx vercel --prod
```

Open the deployed URL. Expected:
- Login page loads
- Can sign in with Google
- Dashboard shows empty state
- PWA installable (check browser address bar for install prompt)

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "chore: deployment verified and production-ready"
git push
```

---

## Self-Review Checklist

**Spec coverage:**
- ✅ Monthly overview with hero, allocation cards, expense list
- ✅ Add expense: amount, currency, description, tag, payment method, bucket, trip
- ✅ Credit card flow — CC expenses logged at spend time, not at bill payment
- ✅ Multi-currency with live exchange rates
- ✅ Bills manager with due dates
- ✅ Bill reminders strip on home (in-app, ≤7 days)
- ✅ Trip envelopes — own budget, rolls into monthly
- ✅ Custom tags with emoji + color + default bucket
- ✅ Monthly allocation — configurable per month (via `updateMonthAllocation`)
- ✅ Month switcher on home
- ✅ Fully adaptive layout — bottom nav mobile, sidebar desktop
- ✅ PWA installable with manifest + service worker
- ✅ Auth — Google + credentials
- ✅ Vercel Postgres (Neon) free tier
- ✅ Deploy to Vercel

**Not in MVP (Phase 8+):**
- Trends/charts page (route exists, content deferred)
- Goals page (route exists, content deferred)
- Tags manager page (route exists, content deferred)
- Push notifications (service worker shell in place, `web-push` installed, wiring deferred)
- Income/allocation settings page
