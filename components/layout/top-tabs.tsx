"use client";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

type Tab = { id: string; label: string; href?: string };

interface Props {
  tabs: Tab[];
}

export function TopTabs({ tabs }: Props) {
  const router = useRouter();
  const path = usePathname();
  const search = useSearchParams();
  const current = search.get("sub") || tabs.find((t) => !t.href)?.id;

  function setSub(id: string) {
    const params = new URLSearchParams(search.toString());
    params.set("sub", id);
    router.push(`${path}?${params.toString()}`);
  }

  const baseCls =
    "relative px-3 py-2.5 text-xs whitespace-nowrap transition-colors";
  const activeCls = "font-bold text-foreground";
  const idleCls = "font-medium text-muted-base hover:text-foreground";

  return (
    <div className="border-b border-accent-purple/13 px-4 md:px-8 flex gap-1 overflow-x-auto">
      {tabs.map((t) => {
        const active = !t.href && current === t.id;
        const cls = `${baseCls} ${active ? activeCls : idleCls}`;
        const underline = active && (
          <span className="absolute -bottom-px left-1.5 right-1.5 h-0.5 rounded bg-gradient-to-r from-amber-400 to-pink-500" />
        );
        if (t.href) {
          return (
            <Link key={t.id} href={t.href} className={cls}>
              {t.label}
            </Link>
          );
        }
        return (
          <button key={t.id} onClick={() => setSub(t.id)} className={cls}>
            {t.label}
            {underline}
          </button>
        );
      })}
    </div>
  );
}
