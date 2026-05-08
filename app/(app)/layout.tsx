import { requireSession } from "@/lib/auth/session";
import { Sidebar } from "@/components/layout/sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { PlusCircle } from "lucide-react";
import Link from "next/link";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireSession();
  return (
    <div className="min-h-screen bg-gradient-app flex">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0 px-4 md:px-8 py-6">
        {children}
      </main>
      <BottomNav />
      <Link
        href="/expenses/new"
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 w-14 h-14 rounded-2xl bg-gradient-brand flex items-center justify-center shadow-lg shadow-accent-gold/30 text-white"
        aria-label="Add expense"
      >
        <PlusCircle size={26} />
      </Link>
    </div>
  );
}
