import Link from "next/link";
import { CreditCard } from "lucide-react";
import { getCreditCardsWithBalances, getCardActivity } from "@/lib/actions/card-payments";
import { PaymentsClient } from "./payments-client";
import { OverallUtilizationCard } from "@/components/payments/overall-utilization-card";
import type { CardActivityRow } from "@/lib/actions/card-payments";

export default async function PaymentsPage() {
  const cards = await getCreditCardsWithBalances();
  const creditCards = cards.filter((c) => c.type === "credit");

  // Fetch activity for each credit card in parallel
  const activityEntries = await Promise.all(
    creditCards.map(async (card) => {
      const activity = await getCardActivity(card.id, 20);
      return [card.id, activity] as [number, CardActivityRow[]];
    }),
  );
  const activities = Object.fromEntries(activityEntries) as Record<number, CardActivityRow[]>;

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-start justify-between gap-2 pb-1">
        <div className="min-w-0">
          <p className="text-[9px] font-bold tracking-[0.15em] uppercase text-muted-base">easyBudget</p>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Pay Credit Card</h1>
          <p className="text-xs text-muted-base mt-0.5">Track what you owe and pay it down</p>
        </div>
      </div>

      {/* Empty state */}
      {creditCards.length === 0 && (
        <div className="rounded-2xl bg-card border border-cardEdge p-8 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-accent-purple/10 flex items-center justify-center">
            <CreditCard size={22} className="text-accent-purple-light" />
          </div>
          <div>
            <p className="text-foreground font-semibold">No credit cards yet</p>
            <p className="text-muted-base text-sm mt-1">Add a credit card in Settings to start tracking payments.</p>
          </div>
          <Link
            href="/settings"
            className="mt-1 px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-br from-amber-400 to-pink-500 text-white hover:opacity-90 transition-opacity"
          >
            Go to Settings
          </Link>
        </div>
      )}

      {/* Overall utilization summary */}
      {creditCards.length > 0 && <OverallUtilizationCard creditCards={creditCards} />}

      {/* Cards */}
      {creditCards.length > 0 && (
        <PaymentsClient cards={creditCards} activities={activities} />
      )}
    </div>
  );
}
