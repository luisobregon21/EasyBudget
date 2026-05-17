"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

type Tab = { label: string; href: string; sub?: string };

const TABS: Tab[] = [
  { label: "Today",    href: "/",         sub: "today" },
  { label: "Expenses", href: "/?sub=expenses", sub: "expenses" },
  { label: "Payments", href: "/payments" },
  { label: "Tags",     href: "/tags" },
  { label: "Trips",    href: "/trips" },
  { label: "Goals",    href: "/goals" },
];

function isActive(path: string, currentSub: string | null, tab: Tab) {
  if (tab.href === "/" || tab.href.startsWith("/?")) {
    if (path !== "/") return false;
    const sub = currentSub ?? "today";
    return tab.sub === sub;
  }
  return path === tab.href || path.startsWith(tab.href + "/");
}

export function DashboardTabs() {
  const path = usePathname();
  const search = useSearchParams();
  const sub = search.get("sub");

  return (
    <div className="md:hidden sticky top-0 z-40 bg-bg-deep/95 backdrop-blur border-b border-accent-purple/13 px-4 flex gap-1 overflow-x-auto">
      {TABS.map((t) => {
        const active = isActive(path, sub, t);
        return (
          <Link
            key={t.label}
            href={t.href}
            className={`relative px-3 py-2.5 text-xs whitespace-nowrap transition-colors ${
              active ? "font-bold text-foreground" : "font-medium text-muted-base hover:text-foreground"
            }`}
          >
            {t.label}
            {active && (
              <span className="absolute -bottom-px left-1.5 right-1.5 h-0.5 rounded bg-gradient-to-r from-amber-400 to-pink-500" />
            )}
          </Link>
        );
      })}
    </div>
  );
}
