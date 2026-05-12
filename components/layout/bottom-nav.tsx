"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Wallet, Receipt, MoreHorizontal, BarChart2, Tag, Plane, Target, Settings, X } from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: typeof Home } | { type: "more"; label: string; icon: typeof MoreHorizontal } | null;

const NAV: NavItem[] = [
  { href: "/",       label: "Home",   icon: Home },
  { href: "/income", label: "Income", icon: Wallet },
  null, // FAB slot
  { href: "/bills",  label: "Bills",  icon: Receipt },
  { type: "more",    label: "More",   icon: MoreHorizontal },
];

const MORE_ITEMS = [
  { href: "/trends",   label: "Trends",   icon: BarChart2 },
  { href: "/tags",     label: "Tags",     icon: Tag },
  { href: "/trips",    label: "Trips",    icon: Plane },
  { href: "/goals",    label: "Goals",    icon: Target },
  { href: "/settings", label: "Settings", icon: Settings },
];

interface Props {
  onAddExpense: () => void;
}

export function BottomNav({ onAddExpense }: Props) {
  const path = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = MORE_ITEMS.some((i) => path === i.href);

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
        <div className="flex justify-around items-center px-2 pb-2">
          {NAV.map((item, idx) => {
            if (!item) {
              return <div key="fab-slot" className="w-16 h-14" />;
            }

            const Icon = item.icon;
            const isMore = "type" in item;
            const active = isMore ? moreActive : path === item.href;

            const inner = active ? (
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
            );

            if (isMore) {
              return (
                <button
                  key="more"
                  type="button"
                  onClick={() => setMoreOpen(true)}
                  className="flex flex-col items-center gap-1 py-2 px-3"
                  aria-label="More"
                >
                  {inner}
                </button>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-1 py-2 px-3"
              >
                {inner}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* More sheet — mobile only */}
      {moreOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-[60] md:hidden"
            onClick={() => setMoreOpen(false)}
          />
          <div className="md:hidden fixed bottom-0 inset-x-0 z-[70] bg-[#1e1235] rounded-t-2xl border-t border-accent-purple/30 shadow-2xl pb-6">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-9 h-1 rounded-full bg-white/20" />
            </div>
            <div className="flex items-center justify-between px-5 py-2">
              <p className="text-foreground font-bold text-base">More</p>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                aria-label="Close"
                className="text-muted-base hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>
            <nav className="px-2 pt-2">
              {MORE_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = path === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-colors",
                      active
                        ? "bg-gradient-card border border-accent-gold/25 text-accent-gold"
                        : "text-foreground hover:bg-white/5"
                    )}
                  >
                    <Icon size={18} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </>
      )}
    </>
  );
}
