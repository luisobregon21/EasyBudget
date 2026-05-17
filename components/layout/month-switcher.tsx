"use client";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatMonth } from "@/lib/utils";

export function MonthSwitcher({ year, month }: { year: number; month: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function go(delta: number) {
    let m = month + delta;
    let y = year;
    if (m < 1)  { m = 12; y--; }
    if (m > 12) { m = 1;  y++; }
    const params = new URLSearchParams(searchParams.toString());
    params.set("year",  String(y));
    params.set("month", String(m));
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-3 bg-white/5 border border-accent-purple/15 rounded-xl px-4 py-2">
      <button onClick={() => go(-1)} className="text-muted-base hover:text-foreground">
        <ChevronLeft size={16} />
      </button>
      <span className="text-accent-purple-light text-sm font-semibold">{formatMonth(year, month)}</span>
      <button onClick={() => go(1)} className="text-muted-base hover:text-foreground">
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
