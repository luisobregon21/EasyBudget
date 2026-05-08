"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BarChart2, Plane, Target, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/",       label: "Home",   icon: Home },
  { href: "/trends", label: "Trends", icon: BarChart2 },
  { href: "/trips",  label: "Trips",  icon: Plane },
  { href: "/goals",  label: "Goals",  icon: Target },
  { href: "/bills",  label: "More",   icon: MoreHorizontal },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-bg-deep/90 backdrop-blur border-t border-accent-purple/10 flex justify-around py-2 z-50">
      {NAV.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href}
          className={cn(
            "flex flex-col items-center gap-1 px-3 py-1",
            path === href ? "text-accent-gold" : "text-muted-base"
          )}>
          <Icon size={20} />
          <span className="text-[9px] uppercase tracking-wide">{label}</span>
        </Link>
      ))}
    </nav>
  );
}
