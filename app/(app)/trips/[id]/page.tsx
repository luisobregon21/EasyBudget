import { getTrip, getTripExpenses } from "@/lib/actions/trips";
import { formatCurrency } from "@/lib/utils";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { EndTripForm } from "@/components/trips/end-trip-form";
import { EditTripDatesForm } from "@/components/trips/edit-trip-dates-form";

export default async function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const trip = await getTrip(parseInt(id));
  if (!trip) notFound();

  const expenseRows = await getTripExpenses(trip.id);
  const totalSpent = expenseRows.reduce((s, e) => s + (e.amountUsd ?? 0), 0);
  const hasBudget  = trip.budgetUsd != null;
  const remaining  = hasBudget ? trip.budgetUsd! - totalSpent : null;
  const pct        = hasBudget && trip.budgetUsd! > 0 ? Math.min((totalSpent / trip.budgetUsd!) * 100, 100) : null;
  const isOngoing  = !trip.endDate;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/trips" className="text-muted-base hover:text-foreground"><ChevronLeft size={20} /></Link>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-foreground text-xl font-bold">{trip.name}</h2>
            {isOngoing && (
              <span className="text-[10px] bg-accent-purple/20 text-accent-purple-light rounded-full px-2 py-0.5 font-semibold">
                Ongoing
              </span>
            )}
          </div>
          <p className="text-muted-base text-sm">
            ✈️ {trip.destination} · {trip.startDate} → {isOngoing ? "ongoing" : trip.endDate}
          </p>
          <div className="mt-1">
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

      {isOngoing && <EndTripForm tripId={trip.id} startDate={trip.startDate} />}

      <div className="rounded-2xl bg-white/[0.03] border border-accent-purple/10 p-5">
        <h3 className="text-accent-purple-light text-[10px] uppercase tracking-widest font-semibold mb-4">Expenses</h3>
        {expenseRows.length === 0 && (
          <p className="text-muted-base text-sm text-center py-4">No expenses logged for this trip yet.</p>
        )}
        {expenseRows.map((e) => (
          <div key={e.id} className="flex justify-between items-center py-2.5 border-b border-white/5 last:border-0">
            <div className="flex items-center gap-3">
              <span className="text-lg">{e.tagEmoji ?? "📦"}</span>
              <div>
                <p className="text-foreground text-sm">{e.description}</p>
                <p className="text-muted-base text-[10px]">{e.date} · {e.tagName ?? "Uncategorized"}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-red-400 text-sm font-semibold">-{formatCurrency(e.amountUsd ?? 0)}</p>
              {e.currency !== "USD" && (
                <p className="text-muted-base text-[10px]">{e.amount} {e.currency}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
