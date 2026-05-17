"use client";

import { useState } from "react";
import { ChartStyleSwitcher } from "./chart-style-switcher";
import { MonthlyAreaChart } from "./monthly-area-chart";
import type { TrendPoint } from "@/lib/actions/trends";

type ChartStyle = "area" | "line" | "bar";

interface Props {
  data: TrendPoint[];
  projected?: number;
}

export function ChartWithSwitcher({ data, projected }: Props) {
  const [style, setStyle] = useState<ChartStyle>("area");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <ChartStyleSwitcher value={style} onChange={setStyle} />
      <div
        style={{
          background: "#181028",
          border: "1px solid rgba(167,139,250,0.13)",
          borderRadius: 12,
          padding: 12,
        }}
      >
        <MonthlyAreaChart data={data} style={style} projected={projected} />
      </div>
    </div>
  );
}
