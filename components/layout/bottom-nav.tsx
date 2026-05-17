"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Wallet, Receipt, BarChart2 } from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: typeof Home } | null;

const NAV: NavItem[] = [
  { href: "/",        label: "Overview", icon: Home },
  { href: "/income",  label: "Income",   icon: Wallet },
  null, // FAB slot
  { href: "/bills",   label: "Bills",    icon: Receipt },
  { href: "/trends",  label: "Trends",   icon: BarChart2 },
];

interface Props {
  onAddExpense: () => void;
}

export function BottomNav({ onAddExpense }: Props) {
  const path = usePathname();

  return (
    <>
      {/* FAB — fixed, centered above nav */}
      <button
        type="button"
        onClick={onAddExpense}
        aria-label="Add expense"
        className={cn(
          "md:hidden fixed bottom-16 left-1/2 -translate-x-1/2 z-[80]",
          "w-14 h-14 rounded-full",
          "bg-gradient-to-br from-amber-400 to-pink-500",
          "shadow-xl shadow-amber-500/40",
          "flex items-center justify-center",
          "text-white text-3xl font-light",
          "border-4 border-bg-deep",
          "transition-transform active:scale-95"
        )}
      >
        +
      </button>

      {/* nav bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-bg-deep/95 backdrop-blur border-t border-accent-purple/10">
        {/* lifecycle tick row */}
        <div className="flex justify-around items-center px-2 pt-1.5">
          {NAV.map((item, idx) =>
            item ? (
              <div key={item.href} className="flex-1 flex justify-center">
                <span className="text-[7px] text-muted-base/50 tracking-widest">→</span>
              </div>
            ) : (
              <div key="fab-tick" className="w-16" />
            )
          )}
        </div>

        <div className="flex justify-around items-center px-2 pb-2">
          {NAV.map((item, idx) => {
            if (!item) {
              return <div key="fab-slot" className="w-16 h-14" />;
            }

            const Icon = item.icon;
            const active = path === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-1 py-2 px-3"
              >
                {active ? (
                  <div className="flex flex-col items-center gap-1 -mt-5">
                    <div className={cn(
                      "w-11 h-11 rounded-full flex items-center justify-center shadow-lg",
                      "bg-gradient-to-br from-accent-purple to-violet-800",
                      "shadow-accent-purple/40"
                    )}>
                      <Icon size={20} className="text-white" />
                    </div>
                    <span className="text-[9px] font-semibold text-accent-purple-light uppercase tracking-wide">
                      {item.label}
                    </span>
                  </div>
                ) : (
                  <>
                    <Icon size={20} className="text-muted-base" />
                    <span className="text-[9px] uppercase tracking-wide text-muted-base">{item.label}</span>
                  </>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
