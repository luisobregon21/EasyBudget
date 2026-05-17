"use client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

interface Props {
  tabs: { id: string; label: string }[];
}

export function TopTabs({ tabs }: Props) {
  const router = useRouter();
  const path = usePathname();
  const search = useSearchParams();
  const current = search.get("sub") || tabs[0]?.id;

  function setSub(id: string) {
    const params = new URLSearchParams(search.toString());
    params.set("sub", id);
    router.push(`${path}?${params.toString()}`);
  }

  return (
    <div className="border-b border-accent-purple/13 px-4 md:px-8 flex gap-1 overflow-x-auto">
      {tabs.map((t) => {
        const active = current === t.id;
        return (
          <button
            key={t.id}
            onClick={() => setSub(t.id)}
            className={`relative px-3 py-2.5 text-xs font-${active ? "bold" : "medium"} whitespace-nowrap transition-colors ${active ? "text-foreground" : "text-muted-base hover:text-foreground"}`}
          >
            {t.label}
            {active && (
              <span className="absolute -bottom-px left-1.5 right-1.5 h-0.5 rounded bg-gradient-to-r from-amber-400 to-pink-500" />
            )}
          </button>
        );
      })}
    </div>
  );
}
