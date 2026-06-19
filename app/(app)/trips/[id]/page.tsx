import { getTrip, getTripExpenses, getTripFinancials } from "@/lib/actions/trips";
import { formatCurrency } from "@/lib/utils";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { EndTripForm } from "@/components/trips/end-trip-form";
import { EditTripDatesForm } from "@/components/trips/edit-trip-dates-form";
import { EditTripDetailsForm } from "@/components/trips/edit-trip-details-form";
import { TripAnalytics } from "@/components/trips/trip-analytics";
import { TripCategoryBudgets } from "@/components/trips/trip-category-budgets";

type TripExpense = Awaited<ReturnType<typeof getTripExpenses>>[number];

/** ISO week-of-year as a sortable string "YYYY-Www" so we can group by week. */
function weekKey(dateStr: string): string {
  // dateStr is "YYYY-MM-DD". Build a local Date — safe for week math.
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  // ISO week: Thursday in target week, then weeks from Jan 4.
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const weekNum = 1 + Math.round(((date.getTime() - firstThursday.getTime()) / 86_400_000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

function weekLabel(key: string, expenses: TripExpense[]): string {
  const dates = expenses.map((e) => e.date).sort();
  const first = dates[0];
  const last  = dates[dates.length - 1];
  const fmt = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };
  if (first === last) return `Week of ${fmt(first)}`;
  return `${fmt(first)} – ${fmt(last)}`;
}

export default async function TripDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ w?: string }>;
}) {
  const { id } = await params;
  const { w: weekParam } = await searchParams;
  const trip = await getTrip(parseInt(id));
  if (!trip) notFound();

  const [expenseRows, financials] = await Promise.all([
    getTripExpenses(trip.id),
    getTripFinancials(trip.id),
  ]);
  const totalSpent = expenseRows.reduce((s: number, e: { amountUsd: number | null }) => s + (e.amountUsd ?? 0), 0);
  const hasBudget  = trip.budgetUsd != null;
  const remaining  = hasBudget ? trip.budgetUsd! - totalSpent : null;
  const pct        = hasBudget && trip.budgetUsd! > 0 ? Math.min((totalSpent / trip.budgetUsd!) * 100, 100) : null;
  const isOngoing  = !trip.endDate;

  // Group expenses by ISO week (descending — most recent first)
  const byWeek = new Map<string, TripExpense[]>();
  for (const e of expenseRows) {
    const k = weekKey(e.date);
    const list = byWeek.get(k) ?? [];
    list.push(e);
    byWeek.set(k, list);
  }
  // Ascending (oldest first) so the week paginator's ← goes back in time.
  const weekKeys = [...byWeek.keys()].sort((a, b) => a.localeCompare(b));

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/trips" className="text-muted-base hover:text-foreground"><ChevronLeft size={20} /></Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-foreground text-xl font-bold truncate">{trip.name}</h2>
            {isOngoing && (
              <span className="text-[10px] bg-accent-purple/20 text-accent-purple-light rounded-full px-2 py-0.5 font-semibold shrink-0">
                Ongoing
              </span>
            )}
          </div>
          <p className="text-muted-base text-sm">
            ✈️ {trip.destination} · {trip.startDate} → {isOngoing ? "ongoing" : trip.endDate} · {trip.primaryCurrency}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
            <EditTripDetailsForm
              tripId={trip.id}
              name={trip.name}
              destination={trip.destination}
              primaryCurrency={trip.primaryCurrency}
            />
            <EditTripDatesForm tripId={trip.id} startDate={trip.startDate} endDate={trip.endDate ?? null} />
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-gradient-card border border-accent-gold/25 p-5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-muted-base text-[10px] uppercase tracking-widest mb-1">
              {hasBudget ? "Budget" : "Plan as you go"}
            </p>
            {hasBudget
              ? <p className="gradient-text text-3xl font-black">{formatCurrency(trip.budgetUsd!)}</p>
              : <p className="text-muted-base text-sm">No budget set</p>
            }
          </div>
          <div className="text-right">
            {remaining !== null
              ? <>
                  <p className={`text-lg font-bold ${remaining >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {formatCurrency(Math.abs(remaining))} {remaining >= 0 ? "left" : "over"}
                  </p>
                  <p className="text-muted-base text-xs">{formatCurrency(totalSpent)} spent</p>
                </>
              : <p className="text-amber-400 font-bold text-lg">{formatCurrency(totalSpent)} spent</p>
            }
          </div>
        </div>
        {pct !== null && (
          <div className="h-2 rounded-full bg-white/[0.08] overflow-hidden">
            <div className="h-full rounded-full bg-gradient-brand" style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>

      {/* Trip-spendable header: arrived − recurring − savings hold.
          Overall progress bar shows spent vs spendable. */}
      {financials && financials.monthCount > 0 && (() => {
        const spendable = financials.tripSpendable;
        const tripSpent = financials.totalSpent;
        const usedPct   = spendable > 0 ? Math.min((tripSpent / spendable) * 100, 100) : 0;
        const over      = tripSpent > spendable && spendable > 0;
        const remaining = Math.max(0, spendable - tripSpent);
        return (
          <div className="rounded-2xl bg-white/[0.03] border border-accent-purple/10 p-5 space-y-3">
            <div className="flex justify-between items-start">
              <div className="min-w-0">
                <p className="text-muted-base text-[10px] uppercase tracking-widest">Trip-spendable</p>
                <p className="gradient-text text-3xl font-black tracking-tight">
                  {formatCurrency(spendable)}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-sm font-bold ${over ? "text-red-400" : "text-foreground"}`}>
                  {formatCurrency(tripSpent)} spent
                </p>
                <p className="text-muted-base text-[10px]">
                  {over
                    ? `${formatCurrency(tripSpent - spendable)} over`
                    : `${formatCurrency(remaining)} left`
                  }
                </p>
              </div>
            </div>

            <div className="h-2 rounded-full bg-white/[0.08] overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${usedPct}%`,
                  background: over ? "#f87171" : "linear-gradient(90deg, #fbbf24, #ec4899)",
                }}
              />
            </div>

            {/* How this was calculated */}
            <details className="cursor-pointer text-[10px] text-muted-base">
              <summary className="hover:text-foreground transition-colors list-none">
                How this was calculated ↓
              </summary>
              <div className="mt-2 space-y-0.5 font-mono tabular-nums">
                <div className="flex justify-between"><span>arrived income</span><span>{formatCurrency(financials.income)}</span></div>
                <div className="flex justify-between"><span>− recurring ({financials.recurringItems.length} bills)</span><span>−{formatCurrency(financials.recurring)}</span></div>
                <div className="flex justify-between"><span>− savings hold ({financials.savingsPct}%)</span><span>−{formatCurrency(financials.savingsHold)}</span></div>
                <div className="flex justify-between border-t border-white/10 pt-1 mt-1 text-foreground font-bold">
                  <span>spendable</span><span>{formatCurrency(spendable)}</span>
                </div>
                {financials.recurringItems.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-white/10 space-y-0.5">
                    <p className="text-muted-base/70 uppercase tracking-widest text-[9px] font-bold mb-1">Recurring bills</p>
                    {financials.recurringItems.map((r, i) => (
                      <div key={i} className="flex justify-between">
                        <span>{r.name}</span>
                        <span>{formatCurrency(r.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </details>
          </div>
        );
      })()}

      {/* Per-category budgets — fixed set of 8 trip categories. */}
      {financials && financials.monthCount > 0 && (
        <TripCategoryBudgets
          tripId={trip.id}
          tripSpendable={financials.tripSpendable}
          categories={financials.categories}
          totalBudgeted={financials.totalBudgeted}
        />
      )}

      {/* Trends: weekly bars, top tags, daily pace vs expected */}
      <TripAnalytics
        expenses={expenseRows}
        startDate={trip.startDate}
        endDate={trip.endDate ?? null}
        budgetUsd={trip.budgetUsd}
        expectedDailyTotal={financials?.tripSpendable ?? null}
      />

      {/* Trip-aware Add Expense: opens the AppShell drawer with this trip pre-selected */}
      <Link
        href={`/trips/${trip.id}?addExpense=1&trip=${trip.id}`}
        className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gradient-brand text-white font-bold text-sm hover:opacity-95 transition-opacity"
      >
        <Plus size={16} /> Add expense to this trip
      </Link>

      {isOngoing && <EndTripForm tripId={trip.id} startDate={trip.startDate} />}

      <div className="rounded-2xl bg-white/[0.03] border border-accent-purple/10 p-5">
        <h3 className="text-accent-purple-light text-[10px] uppercase tracking-widest font-semibold mb-4">Expenses</h3>
        {expenseRows.length === 0 && (
          <p className="text-muted-base text-sm text-center py-4">No expenses logged for this trip yet.</p>
        )}

        {weekKeys.length > 0 && (() => {
          // Week pagination via ?w=N (0 = oldest, default = newest)
          const requested = weekParam ? parseInt(weekParam) : weekKeys.length - 1;
          const weekIdx = Math.max(0, Math.min(weekKeys.length - 1, isNaN(requested) ? weekKeys.length - 1 : requested));
          const wk = weekKeys[weekIdx];
          const items = byWeek.get(wk)!;
          const weekTotal = items.reduce((s, e) => s + (e.amountUsd ?? 0), 0);

          // Group items by date within this week
          const byDay = new Map<string, typeof items>();
          for (const e of items) {
            const list = byDay.get(e.date) ?? [];
            list.push(e);
            byDay.set(e.date, list);
          }
          const dayKeys = [...byDay.keys()].sort((a, b) => b.localeCompare(a));

          const hasPrev = weekIdx > 0;
          const hasNext = weekIdx < weekKeys.length - 1;

          return (
            <>
              {/* Week paginator */}
              <div className="flex items-center justify-between mb-4">
                {hasPrev ? (
                  <Link
                    href={`/trips/${trip.id}?w=${weekIdx - 1}`}
                    className="p-1 text-muted-base hover:text-foreground transition-colors"
                    aria-label="Previous week"
                  >
                    <ChevronLeft size={18} />
                  </Link>
                ) : (
                  <div className="w-7 h-7" />
                )}
                <div className="text-center">
                  <p className="text-foreground text-sm font-semibold">{weekLabel(wk, items)}</p>
                  <p className="text-muted-base text-[10px] font-mono tabular-nums">
                    {formatCurrency(weekTotal)} · {items.length} item{items.length === 1 ? "" : "s"}
                  </p>
                </div>
                {hasNext ? (
                  <Link
                    href={`/trips/${trip.id}?w=${weekIdx + 1}`}
                    className="p-1 text-muted-base hover:text-foreground transition-colors"
                    aria-label="Next week"
                  >
                    <ChevronRight size={18} />
                  </Link>
                ) : (
                  <div className="w-7 h-7" />
                )}
              </div>

              {/* Days within the week */}
              <div className="space-y-4">
                {dayKeys.map((dayKey) => {
                  const dayItems = byDay.get(dayKey)!;
                  const dayTotal = dayItems.reduce((s, e) => s + (e.amountUsd ?? 0), 0);
                  return (
                    <div key={dayKey}>
                      <div className="flex items-baseline justify-between mb-1.5">
                        <p className="text-muted-base text-[10px] uppercase tracking-widest font-bold">
                          {new Date(dayKey + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                        </p>
                        <p className="text-foreground text-xs font-mono tabular-nums">{formatCurrency(dayTotal)}</p>
                      </div>
                      <div className="divide-y divide-white/5">
                        {dayItems.map((e) => (
                          <Link
                            key={e.id}
                            href={`/expenses/${e.id}/edit`}
                            className="flex justify-between items-center py-2.5 hover:bg-white/[0.02] transition-colors -mx-2 px-2 rounded-lg"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="text-lg shrink-0">{e.tagEmoji ?? "📦"}</span>
                              <div className="min-w-0">
                                <p className="text-foreground text-sm truncate">{e.description}</p>
                                <p className="text-muted-base text-[10px]">{e.tagName ?? "Uncategorized"}</p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              {e.currency !== "USD" ? (
                                <>
                                  <p className="text-red-400 text-sm font-semibold">
                                    -{e.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {e.currency}
                                  </p>
                                  <p className="text-muted-base text-[10px]">{formatCurrency(e.amountUsd ?? 0)} USD</p>
                                </>
                              ) : (
                                <p className="text-red-400 text-sm font-semibold">-{formatCurrency(e.amountUsd ?? 0)}</p>
                              )}
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
}
