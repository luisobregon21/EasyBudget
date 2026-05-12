"use server";
import { getDb, months, expenses, tags, trips, incomeEntries } from "@/lib/db";
import { and, eq, inArray, sql } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";

export type Range = "6mo" | "12mo" | "ytd";

export type CategoryView = "monthly" | "daily";

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

export type CategoryTrendRow = {
  tagId: number | null;
  name: string;
  emoji: string;
  currentTotal: number;
  lastMonthTotal: number;
  deltaPct: number;
  sparkline: number[];
  isNew?: boolean;
};

export type DailySpendPoint = { day: number; total: number };

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

export async function getCategoryTrend(
  range: Range,
  selectedYear: number,
  selectedMonth: number,
  view: CategoryView = "monthly",
): Promise<CategoryTrendRow[]> {
  const user = await requireSession();
  const db = getDb();

  if (view === "daily") {
    return getCategoryTrendDaily(user.id!, selectedYear, selectedMonth);
  }
  return getCategoryTrendMonthly(user.id!, db, range, selectedYear, selectedMonth);
}

async function getCategoryTrendMonthly(
  userId: string,
  db: ReturnType<typeof getDb>,
  range: Range,
  selectedYear: number,
  selectedMonth: number,
): Promise<CategoryTrendRow[]> {
  const { year: startYear, month: startMonth } = rangeStart(range, new Date(selectedYear, selectedMonth - 1, 1));
  const selectedKey = selectedYear * 12 + selectedMonth;

  const monthRows = await db.select({ id: months.id, year: months.year, month: months.month })
    .from(months)
    .where(and(
      eq(months.userId, userId),
      sql`${months.year} * 12 + ${months.month} >= ${startYear * 12 + startMonth}`,
      sql`${months.year} * 12 + ${months.month} <= ${selectedKey}`,
    ))
    .orderBy(months.year, months.month);
  if (monthRows.length === 0) return [];
  const monthIds = monthRows.map((m) => m.id);

  const rows = await db.select({
    tagId:    expenses.tagId,
    monthId:  expenses.monthId,
    tagName:  tags.name,
    tagEmoji: tags.emoji,
    total:    sql<number>`sum(${expenses.amountUsd})`,
  })
    .from(expenses)
    .leftJoin(tags, eq(expenses.tagId, tags.id))
    .where(and(eq(expenses.userId, userId), inArray(expenses.monthId, monthIds)))
    .groupBy(expenses.tagId, expenses.monthId, tags.name, tags.emoji);

  type Bucket = { tagId: number | null; name: string; emoji: string; byMonth: Map<number, number> };
  const buckets = new Map<string, Bucket>();
  for (const r of rows) {
    const key = `${r.tagId ?? "null"}|${r.tagName ?? "Untagged"}`;
    let b = buckets.get(key);
    if (!b) {
      b = { tagId: r.tagId, name: r.tagName ?? "Untagged", emoji: r.tagEmoji ?? "🏷️", byMonth: new Map() };
      buckets.set(key, b);
    }
    b.byMonth.set(r.monthId, Number(r.total));
  }

  const currentMonthRow = monthRows.find((m) => m.year === selectedYear && m.month === selectedMonth);
  const currentMonthId  = currentMonthRow?.id ?? null;
  const currentIdx      = currentMonthRow ? monthRows.indexOf(currentMonthRow) : -1;
  const lastMonthId     = currentIdx > 0 ? monthRows[currentIdx - 1].id : null;

  const result: CategoryTrendRow[] = [];
  for (const b of buckets.values()) {
    const sparkline = monthRows.map((m) => b.byMonth.get(m.id) ?? 0);
    const currentTotal   = currentMonthId !== null ? (b.byMonth.get(currentMonthId) ?? 0) : 0;
    const lastMonthTotal = lastMonthId    !== null ? (b.byMonth.get(lastMonthId)    ?? 0) : 0;
    let deltaPct = 0;
    if (lastMonthTotal === 0 && currentTotal > 0) deltaPct = 100;
    else if (lastMonthTotal > 0) deltaPct = Math.round(((currentTotal - lastMonthTotal) / lastMonthTotal) * 100);
    if (sparkline.every((v) => v === 0) && currentTotal === 0) continue;
    result.push({ tagId: b.tagId, name: b.name, emoji: b.emoji, currentTotal, lastMonthTotal, deltaPct, sparkline });
  }
  return result.sort((a, b) => b.currentTotal - a.currentTotal);
}

async function getCategoryTrendDaily(
  userId: string,
  selectedYear: number,
  selectedMonth: number,
): Promise<CategoryTrendRow[]> {
  const db = getDb();

  const [monthRow] = await db.select({ id: months.id })
    .from(months)
    .where(and(
      eq(months.userId, userId),
      eq(months.year, selectedYear),
      eq(months.month, selectedMonth),
    ))
    .limit(1);
  if (!monthRow) return [];

  const rows = await db.select({
    tagId:    expenses.tagId,
    date:     expenses.date,
    tagName:  tags.name,
    tagEmoji: tags.emoji,
    total:    sql<number>`sum(${expenses.amountUsd})`,
  })
    .from(expenses)
    .leftJoin(tags, eq(expenses.tagId, tags.id))
    .where(and(eq(expenses.monthId, monthRow.id), eq(expenses.userId, userId)))
    .groupBy(expenses.tagId, expenses.date, tags.name, tags.emoji);

  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const now = new Date();
  const isCurrentMonth = now.getFullYear() === selectedYear && (now.getMonth() + 1) === selectedMonth;
  const todayIdx = isCurrentMonth ? now.getDate() - 1 : daysInMonth - 1;
  const yesterdayIdx = todayIdx > 0 ? todayIdx - 1 : null;

  type Bucket = { tagId: number | null; name: string; emoji: string; byDay: number[] };
  const buckets = new Map<string, Bucket>();
  for (const r of rows) {
    const key = `${r.tagId ?? "null"}|${r.tagName ?? "Untagged"}`;
    let b = buckets.get(key);
    if (!b) {
      b = {
        tagId: r.tagId,
        name:  r.tagName ?? "Untagged",
        emoji: r.tagEmoji ?? "🏷️",
        byDay: new Array(daysInMonth).fill(0),
      };
      buckets.set(key, b);
    }
    const day = parseInt(r.date.split("-")[2]);
    if (day >= 1 && day <= daysInMonth) {
      b.byDay[day - 1] = Number(r.total);
    }
  }

  const result: CategoryTrendRow[] = [];
  for (const b of buckets.values()) {
    const monthTotal = b.byDay.reduce((s, v) => s + v, 0);
    if (monthTotal === 0) continue;
    const today     = b.byDay[todayIdx] ?? 0;
    const yesterday = yesterdayIdx !== null ? (b.byDay[yesterdayIdx] ?? 0) : 0;
    let deltaPct = 0;
    let isNew = false;
    if (yesterday === 0 && today > 0) {
      isNew = true;
    } else if (today === 0 && yesterday > 0) {
      deltaPct = -100;
    } else if (yesterday > 0) {
      deltaPct = Math.round(((today - yesterday) / yesterday) * 100);
    }
    result.push({
      tagId: b.tagId,
      name: b.name,
      emoji: b.emoji,
      currentTotal: today,
      lastMonthTotal: yesterday,
      deltaPct,
      sparkline: b.byDay,
      isNew,
    });
  }
  return result.sort((a, b) => b.currentTotal - a.currentTotal);
}

export async function getDailySpend(monthId: number, year: number, month: number): Promise<DailySpendPoint[]> {
  const user = await requireSession();
  const db = getDb();

  const rows = await db.select({
    date:  expenses.date,
    total: sql<number>`sum(${expenses.amountUsd})`,
  })
    .from(expenses)
    .where(and(eq(expenses.monthId, monthId), eq(expenses.userId, user.id!)))
    .groupBy(expenses.date);

  const daysInMonth = new Date(year, month, 0).getDate();
  const byDay = new Map<number, number>();
  for (const r of rows) {
    const day = parseInt(r.date.split("-")[2]);
    byDay.set(day, (byDay.get(day) ?? 0) + Number(r.total));
  }
  return Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1, total: byDay.get(i + 1) ?? 0 }));
}

export async function getHeadlineInsight(
  monthId: number,
  income: number,
  buckets: BucketBreakdownRow[],
  thisMonthSpent: number,
  lastMonthSpent: number,
  monthLabel: string,
  lastMonthLabel: string,
): Promise<string> {
  if (lastMonthSpent > 0) {
    const ratio = thisMonthSpent / lastMonthSpent;
    const pct = Math.abs(Math.round(((thisMonthSpent - lastMonthSpent) / lastMonthSpent) * 100));
    if (ratio > 1.5) {
      const biggest = [...buckets].sort((a, b) => b.spent - a.spent)[0];
      const which = biggest ? biggest.bucket[0].toUpperCase() + biggest.bucket.slice(1) : "Spending";
      return `Spending up ${pct}% vs ${lastMonthLabel}. ${which} is the biggest mover.`;
    }
    if (ratio < 0.7) {
      const bills = buckets.find((b) => b.bucket === "bills");
      const billsPct = bills ? bills.pct : 0;
      return `Spending down ${pct}% vs ${lastMonthLabel} — and you're ${billsPct}% into your bills budget.`;
    }
  }
  const hotBucket = buckets.find((b) => b.pct >= 90);
  if (hotBucket) {
    const label = hotBucket.bucket[0].toUpperCase() + hotBucket.bucket.slice(1);
    return `${label} bucket is ${hotBucket.pct}% used — pace check.`;
  }
  if (income > 0) {
    const targetPct = Math.round((thisMonthSpent / income) * 100);
    return `Spending steady. You've used ${targetPct}% of your monthly income.`;
  }
  return `${monthLabel} is just getting started. Add income and expenses to see trends.`;
}
