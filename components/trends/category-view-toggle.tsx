"use client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { CategoryView } from "@/lib/actions/trends";

interface Props {
  current: CategoryView;
}

export function CategoryViewToggle({ current }: Props) {
  const router = useRouter();
  const path = usePathname();
  const search = useSearchParams();

  function setView(v: CategoryView) {
    const params = new URLSearchParams(search.toString());
    params.set("categoryView", v);
    router.push(`${path}?${params.toString()}`);
  }

  return (
    <div className="inline-flex rounded-lg bg-white/[0.04] border border-accent-purple/20 p-1 gap-1 text-xs">
      <button
        type="button"
        onClick={() => setView("daily")}
        className={cn(
          "px-2 py-0.5 rounded font-semibold transition-colors",
          current === "daily" ? "bg-accent-purple text-white" : "text-muted-base hover:text-foreground"
        )}
      >
        Daily
      </button>
      <button
        type="button"
        onClick={() => setView("monthly")}
        className={cn(
          "px-2 py-0.5 rounded font-semibold transition-colors",
          current === "monthly" ? "bg-accent-purple text-white" : "text-muted-base hover:text-foreground"
        )}
      >
        Monthly
      </button>
    </div>
  );
}
