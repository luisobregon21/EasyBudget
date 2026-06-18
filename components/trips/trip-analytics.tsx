import { formatCurrency } from "@/lib/utils";

type Expense = {
  id: number;
  amountUsd: number;
  date: string;
  tagName: string | null;
  tagEmoji: string | null;
};

interface Props {
  expenses: Expense[];
  /** YYYY-MM-DD */
  startDate: string;
  /** YYYY-MM-DD or null for ongoing */
  endDate: string | null;
  /** Optional fixed budget — drives the "pace vs expected" comparison */
  budgetUsd?: number | null;
  /** Fallback when budgetUsd is null — used for plan-as-you-go trips so the
   *  daily pace still has a target. Typically the trip-spendable total. */
  expectedDailyTotal?: number | null;
}

const DAY_MS = 86_400_000;

function parseLocal(d: string): Date {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day);
}

function fmtShort(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** ISO week-of-year as a sortable string "YYYY-Www" */
function weekKey(d: Date): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const weekNum =
    1 +
    Math.round(
      ((date.getTime() - firstThursday.getTime()) / DAY_MS -
        3 +
        ((firstThursday.getUTCDay() + 6) % 7)) /
        7,
    );
  return `${date.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

export function TripAnalytics({ expenses, startDate, endDate, budgetUsd, expectedDailyTotal }: Props) {
  if (expenses.length === 0) return null;

  const todayStr = new Date().toISOString().slice(0, 10);
  const tripStart = parseLocal(startDate);
  const tripEndStr = endDate ?? todayStr;
  const tripEnd = parseLocal(tripEndStr);
  const totalDays = Math.max(1, Math.round((tripEnd.getTime() - tripStart.getTime()) / DAY_MS) + 1);

  // Day index relative to trip start, clamped so an ongoing trip uses "today" as the current day.
  const now = parseLocal(todayStr);
  const effectiveNow = now > tripEnd ? tripEnd : now;
  const elapsedDays = Math.max(1, Math.round((effectiveNow.getTime() - tripStart.getTime()) / DAY_MS) + 1);
  const isOngoing = !endDate;

  const totalSpent = expenses.reduce((s, e) => s + (e.amountUsd ?? 0), 0);
  const dailyAvg = totalSpent / elapsedDays;
  // Pace target: fixed budget if set, otherwise the trip-spendable total
  // so plan-as-you-go trips still get a "% of plan" signal.
  const expectedTotal = budgetUsd != null && budgetUsd > 0
    ? budgetUsd
    : expectedDailyTotal != null && expectedDailyTotal > 0
      ? expectedDailyTotal
      : null;
  const expectedDaily = expectedTotal != null ? expectedTotal / totalDays : null;
  const pacePct = expectedDaily ? Math.round((dailyAvg / expectedDaily) * 100) : null;

  // Weekly bars
  const weekTotals = new Map<string, number>();
  for (const e of expenses) {
    const wk = weekKey(parseLocal(e.date));
    weekTotals.set(wk, (weekTotals.get(wk) ?? 0) + (e.amountUsd ?? 0));
  }
  const weekKeysAsc = [...weekTotals.keys()].sort();
  const weeks = weekKeysAsc.map((wk) => ({ key: wk, total: weekTotals.get(wk)! }));
  const maxWeek = Math.max(0.01, ...weeks.map((w) => w.total));

  // Top categories (by tagName, fallback "Uncategorized")
  const byTag = new Map<string, { total: number; emoji: string | null }>();
  for (const e of expenses) {
    const name = e.tagName ?? "Uncategorized";
    const prev = byTag.get(name);
    byTag.set(name, {
      total: (prev?.total ?? 0) + (e.amountUsd ?? 0),
      emoji: prev?.emoji ?? e.tagEmoji ?? null,
    });
  }
  const topTags = [...byTag.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
  const maxTag = Math.max(0.01, ...topTags.map((t) => t.total));

  // "Day X of Y" line — for ongoing trips show "Day X of Y so far"
  const dayLine = isOngoing
    ? `Day ${elapsedDays} of ${totalDays} · ${formatCurrency(totalSpent)} so far`
    : `${totalDays} days · ${formatCurrency(totalSpent)} total`;

  return (
    <div className="rounded-2xl bg-white/[0.03] border border-accent-purple/10 p-5 space-y-5">
      <div className="flex items-baseline justify-between">
        <h3 className="text-accent-purple-light text-[10px] uppercase tracking-widest font-semibold">
          Trends
        </h3>
        <p className="text-muted-base text-[10px] font-mono">{dayLine}</p>
      </div>

      {/* Daily pace vs expected */}
      <div>
        <div className="flex items-baseline justify-between mb-1">
          <p className="text-muted-base text-[10px] uppercase tracking-widest font-bold">Daily pace</p>
          {pacePct != null && (
            <span
              className={`text-[10px] font-bold ${
                pacePct > 110 ? "text-red-400" : pacePct < 90 ? "text-green-400" : "text-amber-400"
              }`}
            >
              {pacePct}% of plan
            </span>
          )}
        </div>
        <p className="text-foreground text-xl font-black font-mono tabular-nums">
          {formatCurrency(dailyAvg)}<span className="text-muted-base text-xs font-normal">/day</span>
        </p>
        {expectedDaily != null && (
          <p className="text-muted-base text-[10px] mt-0.5">
            expected {formatCurrency(expectedDaily)}/day
          </p>
        )}
      </div>

      {/* Weekly spend bars */}
      {weeks.length > 1 && (
        <div>
          <p className="text-muted-base text-[10px] uppercase tracking-widest font-bold mb-2">
            Weekly spend
          </p>
          <div className="flex items-end gap-1.5 h-20">
            {weeks.map((w, i) => {
              const h = (w.total / maxWeek) * 100;
              return (
                <div key={w.key} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t bg-gradient-to-t from-amber-400 to-pink-500 transition-all"
                    style={{ height: `${Math.max(4, h)}%` }}
                    aria-label={`Week ${i + 1}: ${formatCurrency(w.total)}`}
                  />
                  <p className="text-muted-base text-[9px] font-mono">{i + 1}</p>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-[9px] text-muted-base mt-1">
            <span>{fmtShort(tripStart)}</span>
            <span>{isOngoing ? "now" : fmtShort(tripEnd)}</span>
          </div>
        </div>
      )}

      {/* Top categories */}
      <div>
        <p className="text-muted-base text-[10px] uppercase tracking-widest font-bold mb-2">
          Top categories
        </p>
        <div className="space-y-1.5">
          {topTags.map((t) => {
            const widthPct = (t.total / maxTag) * 100;
            return (
              <div key={t.name} className="flex items-center gap-2">
                <span className="text-base shrink-0 w-5 text-center">{t.emoji ?? "📦"}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between mb-0.5">
                    <span className="text-foreground text-xs truncate">{t.name}</span>
                    <span className="text-foreground text-xs font-mono tabular-nums shrink-0 ml-2">
                      {formatCurrency(t.total)}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-400 to-pink-500"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
