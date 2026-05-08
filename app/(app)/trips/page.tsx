import { getUserTrips } from "@/lib/actions/trips";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, Plane } from "lucide-react";

export default async function TripsPage() {
  const tripsList = await getUserTrips();

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-foreground text-xl font-bold">Trips</h2>
          <p className="text-muted-base text-sm">Plan and track travel budgets</p>
        </div>
        <Link href="/trips/new">
          <Button className="bg-gradient-brand text-white font-bold gap-2">
            <Plus size={16} /> New Trip
          </Button>
        </Link>
      </div>

      {tripsList.length === 0 && (
        <div className="rounded-2xl bg-white/[0.03] border border-accent-purple/10 p-10 text-center">
          <Plane size={32} className="text-muted-base mx-auto mb-3" />
          <p className="text-muted-base text-sm">No trips yet. Plan your next adventure.</p>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {tripsList.map((t) => (
          <Link key={t.id} href={`/trips/${t.id}`}
            className="rounded-2xl bg-gradient-card border border-accent-gold/20 p-5 hover:border-accent-gold/40 transition-colors block">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-foreground font-bold">{t.name}</p>
                <p className="text-muted-base text-xs">✈️ {t.destination}</p>
              </div>
              <span className="text-accent-gold font-bold text-lg">{formatCurrency(t.budgetUsd)}</span>
            </div>
            <p className="text-muted-base text-xs">{t.startDate} → {t.endDate}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
