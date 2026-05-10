"use client";
import { useState } from "react";
import { BottomNav } from "./bottom-nav";
import { Sidebar } from "./sidebar";
import { AddExpenseDrawer } from "./add-expense-drawer";

type SavedMethod = { id: number; name: string; type: string };
type Tag = { id: number; name: string; emoji: string; defaultBucket: "savings" | "bills" | "wants" };

interface Props {
  children: React.ReactNode;
  paymentMethods: SavedMethod[];
  tags: Tag[];
}

export function AppShell({ children, paymentMethods, tags }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const openDrawer = () => setDrawerOpen(true);

  return (
    <>
      <Sidebar onAddExpense={openDrawer} />
      <main className="flex-1 overflow-y-auto pb-24 md:pb-0 px-4 md:px-8 py-6">
        {children}
      </main>
      <BottomNav onAddExpense={openDrawer} />
      <AddExpenseDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        paymentMethods={paymentMethods}
        tags={tags}
      />
    </>
  );
}
