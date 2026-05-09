# Trips — Open-Ended (No End Date) — Design Spec

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow trips with no end date ("ongoing trips"). User can end a trip manually by choosing an end date (defaults to today). Trips list splits into Active and Past tabs.

**Architecture:** Make `endDate` nullable on the `trips` schema. Update trip creation form with optional end date. Add "End Trip" flow with date confirmation. Split trips list into tabs.

---

## 1. Schema Change

```ts
// trips table — change endDate to nullable:
endDate: date("end_date"),  // was .notNull(), now nullable
```

Run `drizzle-kit push` after schema change.

## 2. Trip Creation Form (`/trips/new`)

Add a checkbox: **"I don't have an end date yet"**

- Unchecked (default): End Date field shown, required
- Checked: End Date field hidden, `endDate` saved as `null`
- Start Date remains required

## 3. Trips List Page (`/trips`)

### 3.1 Two tabs: Active | Past

**Active** — trips where `endDate IS NULL` OR `endDate >= today`  
**Past** — trips where `endDate < today`

Default tab: Active.

### 3.2 Ongoing trip card

Ongoing trips (no end date) show:
- Green **"Ongoing"** badge instead of date range
- **"End Trip"** button

### 3.3 End Trip flow

Clicking "End Trip" opens a small inline confirmation panel:

```
End trip: {tripName}

End date: [date picker — defaults to today]

[Cancel]  [End Trip]
```

On confirm: saves `endDate` to the selected date. Trip moves to Past tab on next render. Success toast: "Trip ended".

If selected end date is before start date: show inline validation error "End date must be after start date."

## 4. Trip Edit Page

If a trip has no end date, the edit form shows the "I don't have an end date yet" checkbox pre-checked, End Date field hidden. User can uncheck to set an end date.

## 5. Server Actions

### Updates to `lib/actions/trips.ts`

```ts
// createTrip — endDate now optional
export async function createTrip(prevState: unknown, formData: FormData)
  → { success: boolean; message: string }

// New:
export async function endTrip(tripId: number, prevState: unknown, formData: FormData)
  → { success: boolean; message: string }
// Validates endDate > startDate, sets endDate on the trip

// Updated query helpers:
export async function getActiveTrips()   // endDate IS NULL OR endDate >= today
export async function getPastTrips()     // endDate < today
```

## 6. File Map

```
Modified:
  lib/db/schema.ts                    — endDate nullable
  lib/actions/trips.ts                — endTrip action, getActiveTrips, getPastTrips, updated createTrip
  app/(app)/trips/page.tsx            — Active/Past tabs, Ongoing badge, End Trip button + panel
  app/(app)/trips/new/page.tsx        — optional end date with checkbox
  app/(app)/trips/[id]/page.tsx       — show ongoing state, end date optional in edit
```
