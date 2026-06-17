"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { BottomNav } from "./bottom-nav";
import { Sidebar } from "./sidebar";
import { DashboardTabs } from "./dashboard-tabs";
import { AddExpenseDrawer } from "./add-expense-drawer";

type SavedMethod = { id: number; name: string; type: string };
type Tag = { id: number; name: string; emoji: string; defaultBucket: "savings" | "bills" | "wants" };
type BillOption = { id: number; name: string };
type TripOption = { id: number; name: string; primaryCurrency: string };

interface Props {
  children: React.ReactNode;
  paymentMethods: SavedMethod[];
  tags: Tag[];
  bills: BillOption[];
  trips: TripOption[];
}

export function AppShell({ children, paymentMethods, tags, bills, trips }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [initialTripId, setInitialTripId] = useState<number | null>(null);
  const openDrawer = () => setDrawerOpen(true);

  // URL-triggered drawer: `?addExpense=1[&trip=N]` opens the drawer and optionally
  // pre-selects a trip. Used by trip pages to launch an Add Expense scoped to that trip.
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams.get("addExpense") !== "1") return;
    const tripParam = searchParams.get("trip");
    setInitialTripId(tripParam ? parseInt(tripParam) : null);
    setDrawerOpen(true);
    // Clean the query so refreshing doesn't keep re-opening it.
    const next = new URLSearchParams(searchParams);
    next.delete("addExpense");
    next.delete("trip");
    const q = next.toString();
    router.replace(q ? `${pathname}?${q}` : pathname);
  }, [searchParams, pathname, router]);

  return (
    <>
      <Sidebar onAddExpense={openDrawer} />
      <main
        className="flex-1 overflow-y-auto pb-24 md:pb-0"
        style={{ paddingTop: "max(1.5rem, env(safe-area-inset-top))" }}
      >
        <DashboardTabs />
        <div className="px-4 md:px-8 py-6">
          {children}
        </div>
      </main>
      <BottomNav onAddExpense={openDrawer} />
      <AddExpenseDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setInitialTripId(null); }}
        paymentMethods={paymentMethods}
        tags={tags}
        bills={bills}
        trips={trips}
        initialTripId={initialTripId}
      />
    </>
  );
}
