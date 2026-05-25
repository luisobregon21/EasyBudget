import { requireSession } from "@/lib/auth/session";
import { AppShell } from "@/components/layout/app-shell";
import { getCreditCards } from "@/lib/actions/credit-cards";
import { getUserTags } from "@/lib/actions/tags";
import { getUserBills, reconcileAutoChargedBills } from "@/lib/actions/bills";
import { getActiveTrips } from "@/lib/actions/trips";
import { getOrCreateMonth } from "@/lib/actions/months";
import { currentYearMonth } from "@/lib/utils";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireSession();

  // Materialize auto-charge subscriptions before fetching anything bill-related,
  // so the picker dropdown / bill statuses reflect freshly-posted charges.
  const { year, month } = currentYearMonth();
  const monthRow = await getOrCreateMonth(year, month);
  await reconcileAutoChargedBills(monthRow.id, year, month);

  const [paymentMethods, tags, bills, activeTrips] = await Promise.all([
    getCreditCards(),
    getUserTags(),
    getUserBills(),
    getActiveTrips(),
  ]);
  const billOptions = bills.map((b) => ({ id: b.id, name: b.name }));
  const tripOptions = activeTrips.map((t) => ({
    id: t.id,
    name: t.name,
    primaryCurrency: t.primaryCurrency,
  }));

  return (
    <div className="min-h-screen bg-gradient-app flex">
      <AppShell
        paymentMethods={paymentMethods}
        tags={tags as any}
        bills={billOptions}
        trips={tripOptions}
      >
        {children}
      </AppShell>
    </div>
  );
}
