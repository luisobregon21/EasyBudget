"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, Tag, Plane, Target, Settings, X } from "lucide-react";
import { cn } from "@/lib/utils";

const MORE_ITEMS = [
  { href: "/payments", label: "Payments", icon: CreditCard },
  { href: "/tags",     label: "Tags",     icon: Tag },
  { href: "/trips",    label: "Trips",    icon: Plane },
  { href: "/goals",    label: "Goals",    icon: Target },
  { href: "/settings", label: "Settings", icon: Settings },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function MoreSheet({ open, onClose }: Props) {
  const path = usePathname();

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 z-[60]"
        onClick={onClose}
      />
      <div className="fixed bottom-0 inset-x-0 z-[70] bg-[#1e1235] rounded-t-2xl border-t border-accent-purple/30 shadow-2xl pb-6">
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 rounded-full bg-white/20" />
        </div>
        <div className="flex items-center justify-between px-5 py-2">
          <p className="text-foreground font-bold text-base">More</p>
          <button
            type="button"
            onClick={onClose}
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
                onClick={onClose}
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
  );
}
