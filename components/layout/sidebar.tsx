"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BarChart2, Receipt, Plane, Tag, Target, Settings, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/",        label: "Overview", icon: Home },
  { href: "/income",  label: "Income",   icon: Wallet },
  { href: "/trends",  label: "Trends",   icon: BarChart2 },
  { href: "/bills",   label: "Bills",    icon: Receipt },
  { href: "/trips",   label: "Trips",    icon: Plane },
  { href: "/tags",    label: "Tags",     icon: Tag },
  { href: "/goals",   label: "Goals",    icon: Target },
];

export function Sidebar() {
  const path = usePathname();
  return (
    <nav className="hidden md:flex flex-col w-48 bg-bg-deep/70 border-r border-accent-purple/10 p-4 gap-1">
      <span className="gradient-text font-black text-lg tracking-widest px-2 pb-4 mb-2 border-b border-accent-purple/10">
        EASYBUDGET
      </span>
      {NAV.map(({ href, label, icon: Icon }) => (
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
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-base hover:text-foreground hover:bg-white/5">
        <Settings size={16} /> Settings
      </Link>
    </nav>
  );
}
