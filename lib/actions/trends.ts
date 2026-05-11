"use server";
import { getDb, months, expenses, tags, trips, incomeEntries } from "@/lib/db";
import { and, eq, inArray, sql } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";

export type Range = "6mo" | "12mo" | "ytd";

export type TrendPoint = {
  year: number;
  month: number;
  label: string;        // e.g. "May"
  income: number;
  spent: number;
  savedPct: number;     // (income - spent) / income * 100, 0 if income === 0
};

export type TagBreakdownRow = {
  tagId: number | null;
  name: string;
  emoji: string;
  total: number;
  pct: number;          // share of total spend this month, 0–100
};

export type BucketBreakdownRow = {
  bucket: "savings" | "bills" | "wants";
  spent: number;
  allocated: number;
  pct: number;          // spent / allocated * 100 (NOT capped — the consumer caps for the bar)
};

export type TripBreakdownRow = {
  tripId: number;
  name: string;
  budgetUsd: number | null;
  spent: number;
};

const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function rangeStart(range: Range, now: Date): { year: number; month: number } {
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  if (range === "ytd") return { year: y, month: 1 };
  const monthsBack = range === "6mo" ? 5 : 11;
  const totalMonth = m - monthsBack;
  const yearOffset = Math.floor((totalMonth - 1) / 12);
  const wrappedMonth = ((totalMonth - 1) % 12 + 12) % 12 + 1;
  return { year: y + yearOffset, month: wrappedMonth };
}

export async function getMonthlyTrend(range: Range): Promise<TrendPoint[]> {
  const user = await requireSession();
  const db = getDb();
  const now = new Date();
  const { year: startYear, month: startMonth } = rangeStart(range, now);

  const monthRows = await db.select({
    id:     months.id,
    year:   months.year,
    month:  months.month,
    income: months.income,
  })
    .from(months)
    .where(and(
      eq(months.userId, user.id!),
      sql`${months.year} * 12 + ${months.month} >= ${startYear * 12 + startMonth}`,
    ))
    .orderBy(months.year, months.month);

  if (monthRows.length === 0) return [];

  const monthIds = monthRows.map((m) => m.id);
  const [spendRows, incomeRows] = await Promise.all([
    db.select({
      monthId: expenses.monthId,
      total:   sql<number>`coalesce(sum(${expenses.amountUsd}), 0)`,
    })
      .from(expenses)
      .where(and(eq(expenses.userId, user.id!), inArray(expenses.monthId, monthIds)))
      .groupBy(expenses.monthId),
    db.select({
      monthId: incomeEntries.monthId,
      total:   sql<number>`coalesce(sum(${incomeEntries.amount}), 0)`,
    })
      .from(incomeEntries)
      .where(and(
        eq(incomeEntries.userId, user.id!),
        inArray(incomeEntries.monthId, monthIds),
        inArray(incomeEntries.status, ["arrived", "expected"]),
      ))
      .groupBy(incomeEntries.monthId),
  ]);

  const spendByMonth = new Map<number, number>();
  for (const row of spendRows) spendByMonth.set(row.monthId, Number(row.total));
  const incomeByMonth = new Map<number, number>();
  for (const row of incomeRows) incomeByMonth.set(row.monthId, Number(row.total));

  return monthRows.map((m) => {
    const spent  = spendByMonth.get(m.id) ?? 0;
    const income = incomeByMonth.get(m.id) ?? 0;
    const savedPct = income > 0 ? Math.max(0, ((income - spent) / income) * 100) : 0;
    return {
      year: m.year,
      month: m.month,
      label: MONTH_LABELS[m.month - 1],
      income,
      spent,
      savedPct: Math.round(savedPct),
    };
  });
}

export async function getExpensesByTag(monthId: number): Promise<TagBreakdownRow[]> {
  const user = await requireSession();
  const db = getDb();

  const rows = await db.select({
    tagId:    expenses.tagId,
    tagName:  tags.name,
    tagEmoji: tags.emoji,
    total:    sql<number>`sum(${expenses.amountUsd})`,
  })
    .from(expenses)
    .leftJoin(tags, eq(expenses.tagId, tags.id))
    .where(and(eq(expenses.monthId, monthId), eq(expenses.userId, user.id!)))
    .groupBy(expenses.tagId, tags.name, tags.emoji);

  const totalSpent = rows.reduce((s, r) => s + Number(r.total), 0);

  return rows
    .map((r) => ({
      tagId: r.tagId,
      name:  r.tagName ?? "Untagged",
      emoji: r.tagEmoji ?? "🏷️",
      total: Number(r.total),
      pct:   totalSpent > 0 ? Math.round((Number(r.total) / totalSpent) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

export async function getExpensesByBucket(monthId: number, income: number): Promise<BucketBreakdownRow[]> {
  const user = await requireSession();
  const db = getDb();

  const [monthRow] = await db.select({
    savingsPct: months.savingsPct,
    billsPct:   months.billsPct,
    wantsPct:   months.wantsPct,
  })
    .from(months)
    .where(and(eq(months.id, monthId), eq(months.userId, user.id!)))
    .limit(1);

  if (!monthRow) return [];

  const spendRows = await db.select({
    bucket: expenses.bucket,
    total:  sql<number>`sum(${expenses.amountUsd})`,
  })
    .from(expenses)
    .where(and(eq(expenses.monthId, monthId), eq(expenses.userId, user.id!)))
    .groupBy(expenses.bucket);

  const spentByBucket = new Map<string, number>();
  for (const r of spendRows) spentByBucket.set(r.bucket, Number(r.total));

  const buckets: Array<{ bucket: BucketBreakdownRow["bucket"]; pct: number }> = [
    { bucket: "savings", pct: monthRow.savingsPct },
    { bucket: "bills",   pct: monthRow.billsPct },
    { bucket: "wants",   pct: monthRow.wantsPct },
  ];

  return buckets.map(({ bucket, pct }) => {
    const allocated = income * (pct / 100);
    const spent     = spentByBucket.get(bucket) ?? 0;
    const usedPct   = allocated > 0 ? Math.round((spent / allocated) * 100) : 0;
    return { bucket, spent, allocated, pct: usedPct };
  });
}

export async function getTripSpend(monthId: number): Promise<TripBreakdownRow[]> {
  const user = await requireSession();
  const db = getDb();

  const rows = await db.select({
    tripId:    trips.id,
    tripName:  trips.name,
    budgetUsd: trips.budgetUsd,
    total:     sql<number>`coalesce(sum(${expenses.amountUsd}), 0)`,
  })
    .from(expenses)
    .innerJoin(trips, eq(expenses.tripId, trips.id))
    .where(and(eq(expenses.monthId, monthId), eq(expenses.userId, user.id!)))
    .groupBy(trips.id, trips.name, trips.budgetUsd);

  return rows
    .map((r) => ({
      tripId:    r.tripId,
      name:      r.tripName,
      budgetUsd: r.budgetUsd,
      spent:     Number(r.total),
    }))
    .sort((a, b) => b.spent - a.spent);
}
