import { getActiveTrips, getPastTrips } from "@/lib/actions/trips";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, Plane } from "lucide-react";

export default async function TripsPage() {
  const [active, past] = await Promise.all([getActiveTrips(), getPastTrips()]);

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

      {active.length === 0 && past.length === 0 && (
        <div className="rounded-2xl bg-white/[0.03] border border-accent-purple/10 p-10 text-center">
          <Plane size={32} className="text-muted-base mx-auto mb-3" />
          <p className="text-muted-base text-sm">No trips yet. Plan your next adventure.</p>
        </div>
      )}

      {active.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-foreground font-semibold text-sm uppercase tracking-widest text-muted-base">Active</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {active.map((t) => (
              <Link key={t.id} href={`/trips/${t.id}`}
                className="rounded-2xl bg-gradient-card border border-accent-gold/20 p-5 hover:border-accent-gold/40 transition-colors block">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-foreground font-bold">{t.name}</p>
                      {!t.endDate && (
                        <span className="text-[10px] bg-accent-purple/20 text-accent-purple-light rounded-full px-2 py-0.5 font-semibold">
                          Ongoing
                        </span>
                      )}
                    </div>
                    <p className="text-muted-base text-xs">✈️ {t.destination}</p>
                  </div>
                  <span className="text-accent-gold font-bold text-lg">
                    {t.budgetUsd != null ? formatCurrency(t.budgetUsd) : <span className="text-muted-base text-sm font-normal">Plan as you go</span>}
                  </span>
                </div>
                <p className="text-muted-base text-xs">
                  {t.startDate} → {t.endDate ?? "ongoing"}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-foreground font-semibold text-sm uppercase tracking-widest text-muted-base">Past</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {past.map((t) => (
              <Link key={t.id} href={`/trips/${t.id}`}
                className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-5 hover:border-white/[0.12] transition-colors block">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-foreground font-bold">{t.name}</p>
                    <p className="text-muted-base text-xs">✈️ {t.destination}</p>
                  </div>
                  <span className="text-muted-base font-bold text-lg">
                    {t.budgetUsd != null ? formatCurrency(t.budgetUsd) : "Plan as you go"}
                  </span>
                </div>
                <p className="text-muted-base text-xs">{t.startDate} → {t.endDate}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
