"use client";
import { useState } from "react";
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
  const openDrawer = () => setDrawerOpen(true);

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
        onClose={() => setDrawerOpen(false)}
        paymentMethods={paymentMethods}
        tags={tags}
        bills={bills}
        trips={trips}
      />
    </>
  );
}
