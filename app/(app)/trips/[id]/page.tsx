import { getTrip, getTripExpenses } from "@/lib/actions/trips";
import { formatCurrency } from "@/lib/utils";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const trip = await getTrip(parseInt(id));
  if (!trip) notFound();

  const expenseRows = await getTripExpenses(trip.id);
  const totalSpent = expenseRows.reduce((s, e) => s + (e.amountUsd ?? 0), 0);
  const remaining  = trip.budgetUsd - totalSpent;
  const pct = trip.budgetUsd > 0 ? Math.min((totalSpent / trip.budgetUsd) * 100, 100) : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/trips" className="text-muted-base hover:text-foreground"><ChevronLeft size={20} /></Link>
        <div>
          <h2 className="text-foreground text-xl font-bold">{trip.name}</h2>
          <p className="text-muted-base text-sm">✈️ {trip.destination} · {trip.startDate} → {trip.endDate}</p>
        </div>
      </div>

      <div className="rounded-2xl bg-gradient-card border border-accent-gold/25 p-5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-muted-base text-[10px] uppercase tracking-widest mb-1">Budget</p>
            <p className="gradient-text text-3xl font-black">{formatCurrency(trip.budgetUsd)}</p>
          </div>
          <div className="text-right">
            <p className={`text-lg font-bold ${remaining >= 0 ? "text-green-400" : "text-red-400"}`}>
              {formatCurrency(Math.abs(remaining))} {remaining >= 0 ? "left" : "over"}
            </p>
            <p className="text-muted-base text-xs">{formatCurrency(totalSpent)} spent</p>
          </div>
        </div>
        <div className="h-2 rounded-full bg-white/[0.08] overflow-hidden">
          <div className="h-full rounded-full bg-gradient-brand" style={{ width: `${pct}%` }} />
        </div>
      </div>

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
