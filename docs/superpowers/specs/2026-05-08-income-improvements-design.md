# Income Improvements — Design Spec

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix biweekly pay date generation to use a real anchor date (supporting 3-paycheck months), fix the one-time date picker, allow full editing of income entries, and save recurring clients as reusable templates for one-time income.

**Architecture:** Schema addition (`anchorDate` on `incomeSources`). Updated generation logic. New edit UI on income entries. Client template dropdown in `IncomeForm`.

---

## 1. Schema Change

Add to `incomeSources`:

```ts
anchorDate: date("anchor_date"),  // nullable — the date of the first paycheck, used for biweekly generation
```

Run `drizzle-kit push` after schema change.

## 2. Biweekly Generation Logic

### 2.1 Anchor date requirement

- New biweekly sources: `anchorDate` is a **required** field in the form
- Existing biweekly sources without `anchorDate`: show a per-source banner on `/income`:
  > "Set a pay start date for **Employer X** to get accurate pay dates. [Set date →]"
  Clicking opens an inline date picker that saves `anchorDate` without re-entering all other fields.

### 2.2 Generation algorithm

```ts
function getBiweeklyDatesInMonth(anchorDate: Date, year: number, month: number): string[] {
  const dates: string[] = [];
  // Start from anchorDate, walk forward in 14-day steps
  // Collect all dates that fall within the target month
  let current = new Date(anchorDate);
  // Walk backward to find the first occurrence at or before the month start
  const monthStart = new Date(year, month - 1, 1);
  while (current > monthStart) current = addDays(current, -14);
  while (current < monthStart) current = addDays(current, 14);
  // Collect all dates within the month
  const monthEnd = new Date(year, month, 0); // last day of month
  while (current <= monthEnd) {
    dates.push(formatDate(current)); // YYYY-MM-DD
    current = addDays(current, 14);
  }
  return dates;
}
```

This correctly produces 2 or 3 dates depending on the month and anchor alignment.

### 2.3 Idempotency

`generateMonthIncomeEntries` already checks for existing entries per `sourceId + monthId` before inserting. The biweekly check must match on both `sourceId + monthId` (not individual dates) — if any entries exist for that source+month, skip the whole source. This prevents partial re-generation.

## 3. One-Time Date Picker Fix

In `components/income/income-form.tsx`:

The `<Input type="date" name="expectedDate" />` is conditionally rendered only when `frequency === "one_time"` but the `required` attribute must also be conditional. Additionally, the native date input needs a `min` attribute to prevent past dates only if desired — leave it unrestricted (users may add past one-time payments).

Fix: ensure `required` is only on the field when it's visible, and that the field is actually in the DOM when `frequency === "one_time"` before form submission.

## 4. Edit Income Entry

### 4.1 UI

Each row in `IncomeEntryList` gets an **edit (pencil) button**. Clicking it replaces the row with an inline edit form (same row, expands in place).

### 4.2 Edit form fields

All fields editable:
1. **Name** — text
2. **Amount** — number
3. **Expected Date** — date picker
4. **Status** — select: Expected / Might Arrive / Arrived
5. **Arrived Date** — date picker, shown only when status = Arrived

### 4.3 Server action

```ts
export async function updateIncomeEntry(
  entryId: number,
  prevState: unknown,
  formData: FormData
): Promise<{ success: boolean; message: string }>
```

Updates all fields. If status changes to/from "arrived", updates `arrivedDate` accordingly (today if newly arrived, null if changed away).

## 5. Saved Clients / Source Templates

### 5.1 One-time income templates

`incomeSources` with `frequency = "one_time"` and `active = true` acts as a client template. These are never auto-generated — they only serve as a name+amount lookup.

### 5.2 IncomeForm changes

When `frequency === "one_time"`:
- Show a **"Saved client"** dropdown above the Name field
- Options: "New client" (default) + all saved one-time sources
- Selecting a saved client pre-fills Name and Amount fields
- Name field remains editable after pre-fill
- On save: if Name doesn't match any existing one-time source, create a new `incomeSources` record with `frequency = "one_time"`

```tsx
// Dropdown behavior:
const [selectedClient, setSelectedClient] = useState<string>("new");

// When selectedClient changes to a saved source id:
// → set name field value to source.name
// → set amount field value to source.amount
```

### 5.3 New server action: `getOneTimeIncomeSources()`

Returns all `incomeSources` where `frequency = "one_time"` and `active = true` for the current user. Called from the income page and passed as a prop to `IncomeForm`.

### 5.4 Managing saved clients

On the income page, a collapsible "Saved Clients" section lists all one-time sources with a delete button. Deleting a source doesn't delete past entries (sourceId is nullable on entries).

## 6. File Map

```
Modified:
  lib/db/schema.ts                         — anchorDate on incomeSources
  lib/actions/income.ts                    — biweekly generation, updateIncomeEntry, getOneTimeIncomeSources
  components/income/income-form.tsx        — date picker fix, saved clients dropdown, anchorDate field for biweekly
  components/income/income-entry-list.tsx  — edit button + inline edit form per row
  app/(app)/income/page.tsx                — anchor date banners, pass oneTimeSources to IncomeForm, saved clients section
```
