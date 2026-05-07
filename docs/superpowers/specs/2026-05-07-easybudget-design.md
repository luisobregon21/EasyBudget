# EasyBudget — Design Spec
**Date:** 2026-05-07  
**Status:** Approved for implementation

---

## Context

Luis currently tracks income, bills, expenses, savings, and subscriptions using a monthly spreadsheet. It works but isn't available on his phone, requires manual math, and doesn't handle travel well. EasyBudget replaces the spreadsheet with a PWA that feels like a premium fintech app — immersive, fast, and personal.

---

## Visual Identity

- **Style:** Bold Gradient — deep purple/indigo base with gold-to-pink gradient accents
- **Palette:** Background `#1e0a3c → #3b0764 → #1e1b4b`, accent gradient `#f59e0b → #ec4899`, purple tones `#a78bfa / #c4b5fd` for secondary text
- **Typography:** System font stack; heavy weights (700–800) for amounts, uppercase tracking for labels
- **Feel:** Immersive, premium, exciting — budgeting should feel good

---

## Layout — Fully Adaptive PWA

- **Mobile (< 768px):** Full-screen cards, bottom tab navigation (Home / Trends / Trips / Goals / More)
- **Desktop (≥ 768px):** Persistent sidebar navigation, main content area to the right
- **Tablet:** Sidebar collapses or shows icon-only
- Navigation sections: **Overview, Trends, Bills, Trips, Tags, Goals, Settings**
- Floating action button (+ FAB) always visible for quick expense entry

---

## Core Data Model

### Monthly Budget
Each month has one budget record:
- `income` — total income for the month
- `opening_balance` — cash at start of month (manually entered or carried from previous month's closing balance)
- `closing_balance` — computed: opening_balance + income − total expenses
- `allocation` — savings %, wants %, bills % (defaults from user settings, overridable per month)

### Expense
Every transaction logged by the user:
- `amount` — numeric
- `currency` — ISO code (USD, NIO, GTQ, etc.)
- `amount_usd` — converted amount (stored at time of entry)
- `exchange_rate` — rate used for conversion
- `description` — free text
- `date` — when spent (not when paid)
- `payment_method` — `cash | debit | credit_card`
- `category` — one of the user's tags
- `bucket` — `savings | bills | wants`
- `trip_id` — optional, links to a trip envelope
- `month_id` — which monthly budget this belongs to

### Bill / Recurring Item
- `name`, `amount`, `due_day` (day of month), `category`
- `type` — `utility | subscription | credit_card | loan | other`
- `reminder_days_before` — how many days ahead to notify (default: 3)
- Generates a reminder notification before each due date

### Trip Envelope
- `name`, `destination`, `start_date`, `end_date`
- `budget_usd` — planned spending limit
- `primary_currency` — local currency for the trip
- Expenses tagged to the trip show in both the trip view and the monthly overview
- Home bills (rent, utilities) continue normally during trips — they are not part of the trip envelope

---

## Key Features

### 1. Monthly Overview (Home)
- Hero card: income, opening/closing balance, cash left, on-track status
- Allocation cards: Savings / Bills / Wants — each shows target %, allocated amount, spent, remaining, mini progress bar
- Recent expenses list
- Subscriptions panel with next renewal dates
- Month switcher (‹ February 2026 ›) to browse history

### 2. Expense Entry (FAB → Add Expense)
- Amount field with currency selector (defaults to USD, switchable for travel)
- Foreign currency auto-converts to USD at live rate; stores both values
- Description (free text)
- Category/Tag — pill selector from user's custom tags + "New tag"
- Payment method — Cash | Debit Card | Credit Card
  - Credit Card selection shows a contextual note: this expense is logged now; the CC bill is a separate payment at month end, no double-counting
  - Cash selection for foreign currency shows the converted USD amount
- Bucket assignment — Savings / Bills / Wants (auto-suggested from category, overridable)
- Trip selector — optional, links expense to an active trip envelope

### 3. Bills & Reminders
- List of all recurring bills with due dates, amounts, and type
- Upcoming reminders shown on home screen (e.g. "Netflix renews in 3 days — $30")
- Push notifications (PWA) sent N days before due date (user-configurable per bill)
- Credit card bill entry: a bill item that represents the total CC payment — not double-counted with already-logged CC expenses
- Bills auto-populate into the Bills bucket of the current month

### 4. Trends
- Monthly spending by category over time (bar/line charts)
- Savings rate trend
- Bills vs Wants vs Savings split over time
- Patterns: "You spend most on Food in months where you travel"

### 5. Trip Budgets
- Create a trip: name, destination, dates, budget (USD), primary local currency
- Trip view: envelope progress (spent vs budget), day-by-day expense log, currency breakdown
- All trip expenses also roll into the monthly budget — home bills don't pause
- Multi-currency: enter local amount, stored with exchange rate, displayed in both currencies

### 6. Custom Tags
- User creates their own tags (name + emoji + color)
- Defaults seeded from spreadsheet: Food, Clothes, Travel, Night Outs, Family, Car, Other, Subscriptions, Utilities, Housing
- Tags map to a bucket (Bills / Wants / Savings) by default, overridable per expense

### 7. Goals & Allocation Settings
- Default split (e.g. 20% Savings / 10% Wants / 70% Bills) saved in user settings
- Per-month override — e.g. a travel month shifts the split
- Future: savings goals (e.g. "Emergency fund: $10,000 — $6,500 saved")

### 8. Multi-Currency
- Default currency: USD
- Per-expense currency selector
- Exchange rate fetched at time of entry (live API) and stored
- All totals and charts display in USD; original currency shown as metadata

---

## Bill Reminder Flow

1. User creates a bill with a due day and reminder preference (e.g. 3 days before)
2. App schedules a push notification for that date each month
3. Home screen shows an "Upcoming" strip: bills due in the next 7 days
4. Tapping a reminder marks it acknowledged; tapping "Pay" logs a payment transaction

---

## Tech Stack

- **Framework:** Next.js (App Router) — PWA via `next-pwa` or service worker
- **UI:** shadcn/ui + Tailwind CSS with custom Bold Gradient theme
- **Database:** Vercel Postgres (Neon) — free tier, native Vercel integration
- **ORM:** Drizzle ORM (`drizzle-orm/vercel-postgres`)
- **Auth:** Auth.js v5 (NextAuth) with Credentials + Google providers, Drizzle adapter
- **Currency rates:** Open exchange rates API (free tier) or similar
- **Push notifications:** Web Push API via service worker
- **Deployment:** Vercel

---

## Screens / Routes

| Route | Screen |
|---|---|
| `/` | Home — monthly overview |
| `/expenses` | Full expense log |
| `/expenses/new` | Add expense (also accessible via FAB) |
| `/bills` | Bills & subscriptions manager |
| `/bills/new` | Add/edit a bill |
| `/trips` | Trip list |
| `/trips/[id]` | Trip envelope detail |
| `/trips/new` | Create trip |
| `/trends` | Charts & patterns |
| `/tags` | Tag manager |
| `/goals` | Goals & allocation settings |
| `/settings` | Account, default split, notifications |

---

## Verification Plan

1. Add an expense in USD → appears in correct month, correct bucket, correct tag
2. Add a credit card expense → CC bill at month end does not double-count it
3. Add a cash expense in NIO → stored with exchange rate, USD total updates correctly
4. Create a trip → trip expenses appear in both trip view and monthly overview
5. Create a bill with a 3-day reminder → upcoming strip shows it on the home screen
6. Change monthly allocation % → home allocation cards reflect the override, not the default
7. Browse to previous month → all data correct for that month
8. Open on mobile → bottom nav visible, layout correct
9. Open on desktop → sidebar visible, same data
10. Install as PWA → works offline for viewing, syncs when reconnected
