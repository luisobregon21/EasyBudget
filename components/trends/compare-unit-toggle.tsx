"use client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import type { CompareUnit } from "@/lib/actions/trends";

const UNITS: { id: CompareUnit; label: string }[] = [
  { id: "day",   label: "Day"   },
  { id: "month", label: "Month" },
  { id: "year",  label: "Year"  },
];

export function CompareUnitToggle({ current }: { current: CompareUnit }) {
  const router = useRouter();
  const path   = usePathname();
  const search = useSearchParams();

  function setUnit(unit: CompareUnit) {
    const params = new URLSearchParams(search.toString());
    params.set("compareUnit", unit);
    router.push(`${path}?${params.toString()}`);
  }

  return (
    <div
      style={{
        display: "flex",
        gap: 4,
        background: "#181028",
        border: "1px solid rgba(167,139,250,0.13)",
        borderRadius: 10,
        padding: 4,
      }}
    >
      {UNITS.map((u) => {
        const active = current === u.id;
        return (
          <button
            key={u.id}
            type="button"
            onClick={() => setUnit(u.id)}
            style={{
              flex: 1,
              padding: "6px 0",
              borderRadius: 7,
              fontSize: 11,
              fontWeight: active ? 700 : 500,
              background: active ? "rgba(167,139,250,0.18)" : "transparent",
              color: active ? "#ede9f6" : "#8a7da8",
              border: "none",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {u.label}
          </button>
        );
      })}
    </div>
  );
}
