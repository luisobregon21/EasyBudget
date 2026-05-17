"use client";

import { useState } from "react";
import { Activity, TrendingUp, PieChart } from "lucide-react";

type ChartStyle = "area" | "line" | "bar";

interface Props {
  value?: ChartStyle;
  onChange?: (style: ChartStyle) => void;
}

const OPTIONS: { id: ChartStyle; label: string; Icon: typeof Activity }[] = [
  { id: "area", label: "Area", Icon: Activity  },
  { id: "line", label: "Line", Icon: TrendingUp },
  { id: "bar",  label: "Bar",  Icon: PieChart   },
];

export function ChartStyleSwitcher({ value, onChange }: Props) {
  const [internal, setInternal] = useState<ChartStyle>(value ?? "area");
  const current = value ?? internal;

  function pick(s: ChartStyle) {
    setInternal(s);
    onChange?.(s);
  }

  return (
    <div style={{ display: "flex", gap: 4 }}>
      {OPTIONS.map(({ id, label, Icon }) => {
        const active = current === id;
        return (
          <button
            key={id}
            onClick={() => pick(id)}
            style={{
              flex: 1,
              padding: "6px 8px",
              background: active ? "rgba(255,255,255,0.025)" : "transparent",
              border: active ? "1px solid rgba(167,139,250,0.10)" : "1px solid rgba(167,139,250,0.13)",
              color: active ? "#ede9f6" : "#8a7da8",
              fontSize: 11,
              fontWeight: 500,
              cursor: "pointer",
              borderRadius: 7,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              textTransform: "capitalize",
            }}
          >
            <Icon size={11} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
