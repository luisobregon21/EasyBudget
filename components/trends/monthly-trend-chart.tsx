"use client";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TrendPoint } from "@/lib/actions/trends";
import { formatCurrency } from "@/lib/utils";

interface Props {
  data: TrendPoint[];
}

interface TooltipPayloadItem {
  payload: TrendPoint;
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-xl border border-accent-purple/30 bg-[#1e1235] px-3 py-2 text-xs shadow-lg">
      <p className="text-accent-gold font-bold mb-1">{point.label}</p>
      <p className="text-amber-400">Income: {formatCurrency(point.income)}</p>
      <p className="text-pink-400">Spent: {formatCurrency(point.spent)}</p>
      <p className="text-foreground mt-1">Saved: {point.savedPct}%</p>
    </div>
  );
}

export function MonthlyTrendChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <p className="text-muted-base text-sm text-center py-8">
        Not enough data for a trend yet. Add income and expenses to see your history.
      </p>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "#a78bfa", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fill: "#9ca3af", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `$${Math.round(v / 1000)}k`}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(167,139,250,0.08)" }} />
          <Bar dataKey="income" name="Income" fill="#fbbf24" radius={[6, 6, 0, 0]} />
          <Bar dataKey="spent"  name="Spent"  fill="#ec4899" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
