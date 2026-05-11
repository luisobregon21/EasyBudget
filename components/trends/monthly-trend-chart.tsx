"use client";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TrendPoint } from "@/lib/actions/trends";
import { formatCurrency } from "@/lib/utils";

interface Props {
  data: TrendPoint[];
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
          <Tooltip
            contentStyle={{
              background: "#1e1235",
              border: "1px solid rgba(167,139,250,0.3)",
              borderRadius: 12,
              fontSize: 12,
            }}
            formatter={(v, name) => [formatCurrency(typeof v === "number" ? v : 0), String(name ?? "")]}
            labelStyle={{ color: "#fbbf24", fontWeight: 700 }}
          />
          <Bar dataKey="income" name="Income" fill="#fbbf24" radius={[6, 6, 0, 0]} />
          <Bar dataKey="spent"  name="Spent"  fill="#ec4899" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
