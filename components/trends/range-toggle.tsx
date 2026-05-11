"use client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Range } from "@/lib/actions/trends";

const OPTIONS: { value: Range; label: string }[] = [
  { value: "6mo",  label: "6 mo"  },
  { value: "12mo", label: "12 mo" },
  { value: "ytd",  label: "YTD"   },
];

interface Props {
  current: Range;
}

export function RangeToggle({ current }: Props) {
  const router = useRouter();
  const path = usePathname();
  const search = useSearchParams();

  function setRange(r: Range) {
    const params = new URLSearchParams(search.toString());
    params.set("range", r);
    router.push(`${path}?${params.toString()}`);
  }

  return (
    <div className="inline-flex rounded-xl bg-white/[0.04] border border-accent-purple/20 p-1 gap-1">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => setRange(o.value)}
          className={cn(
            "px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors",
            current === o.value
              ? "bg-accent-purple text-white"
              : "text-muted-base hover:text-foreground"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
