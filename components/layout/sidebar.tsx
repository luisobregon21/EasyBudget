"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BarChart2, Receipt, Wallet, CreditCard, Tag, Plane, Target, Settings, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const TOP_NAV = [
  { href: "/",        label: "Overview", icon: Home },
  { href: "/income",  label: "Income",   icon: Wallet },
  { href: "/bills",   label: "Bills",    icon: Receipt },
  { href: "/trends",  label: "Trends",   icon: BarChart2 },
];

const MORE_NAV = [
  { href: "/payments", label: "Payments", icon: CreditCard },
  { href: "/tags",     label: "Tags",     icon: Tag },
  { href: "/trips",    label: "Trips",    icon: Plane },
  { href: "/goals",    label: "Goals",    icon: Target },
];

interface Props {
  onAddExpense: () => void;
}

export function Sidebar({ onAddExpense }: Props) {
  const path = usePathname();
  return (
    <nav className="hidden md:flex flex-col w-48 bg-bg-deep/70 border-r border-accent-purple/10 p-4 gap-1">
      <span className="gradient-text font-black text-lg tracking-widest px-2 pb-4 mb-2 border-b border-accent-purple/10">
        EASYBUDGET
      </span>
      <button
        type="button"
        onClick={onAddExpense}
        className="flex items-center justify-center gap-2 px-3 py-2.5 mb-2 rounded-xl text-sm font-bold text-white bg-gradient-to-br from-amber-400 to-pink-500 shadow-md shadow-amber-500/30 transition-transform active:scale-95 hover:opacity-95"
      >
        <Plus size={16} />
        Add Expense
      </button>

      {TOP_NAV.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors",
            path === href
              ? "bg-gradient-card border border-accent-gold/25 text-accent-gold"
              : "text-muted-base hover:text-foreground hover:bg-white/5"
          )}>
          <Icon size={16} />
          {label}
        </Link>
      ))}

      <div className="mt-4 mb-1 px-3">
        <p className="text-[9px] font-bold tracking-[0.15em] uppercase text-muted-base/60">More</p>
      </div>

      {MORE_NAV.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors",
            path === href
              ? "bg-gradient-card border border-accent-gold/25 text-accent-gold"
              : "text-muted-base hover:text-foreground hover:bg-white/5"
          )}>
          <Icon size={16} />
          {label}
        </Link>
      ))}

      <div className="flex-1" />
      <Link href="/settings"
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors",
          path === "/settings"
            ? "bg-gradient-card border border-accent-gold/25 text-accent-gold"
            : "text-muted-base hover:text-foreground hover:bg-white/5"
        )}>
        <Settings size={16} /> Settings
      </Link>
    </nav>
  );
}
