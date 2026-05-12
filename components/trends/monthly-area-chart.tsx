"use client";
import type { TrendPoint } from "@/lib/actions/trends";

interface Props {
  data: TrendPoint[];
}

function formatTick(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  if (n === 0) return "$0";
  return `$${Math.round(n)}`;
}

function niceMax(raw: number): number {
  if (raw <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const ratio = raw / pow;
  if (ratio <= 1) return pow;
  if (ratio <= 2) return 2 * pow;
  if (ratio <= 5) return 5 * pow;
  return 10 * pow;
}

export function MonthlyAreaChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <p className="text-muted-base text-sm text-center py-8">
        Not enough data for a trend yet. Add income and expenses to see your history.
      </p>
    );
  }
  const rawMax = Math.max(...data.map((d) => Math.max(d.income, d.spent))) || 1;
  const max = niceMax(rawMax);
  const w = 600, h = 180;
  const padL = 44, padR = 8, padT = 8, padB = 22;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;
  const step = data.length === 1 ? 0 : plotW / (data.length - 1);
  const ticks = [0, max / 4, max / 2, (3 * max) / 4, max];
  const x = (i: number) => padL + i * step;
  const y = (v: number) => padT + plotH - (v / max) * plotH;
  const incomePath = data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d.income).toFixed(1)}`).join(" ");
  const spendPath  = data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d.spent).toFixed(1)}`).join(" ");
  const baseY = padT + plotH;
  const incomeArea = incomePath + ` L${padL + plotW},${baseY} L${padL},${baseY} Z`;
  const spendArea  = spendPath  + ` L${padL + plotW},${baseY} L${padL},${baseY} Z`;
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full block">
        <defs>
          <linearGradient id="area-income" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="area-spend" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ec4899" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#ec4899" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t, i) => {
          const ty = y(t);
          return (
            <g key={i}>
              <line x1={padL} x2={w - padR} y1={ty} y2={ty} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
              <text x={padL - 6} y={ty + 3} textAnchor="end" fontSize="9" fill="#a78bfa">{formatTick(t)}</text>
            </g>
          );
        })}
        <path d={incomeArea} fill="url(#area-income)" />
        <path d={spendArea} fill="url(#area-spend)" />
        <path d={incomePath} fill="none" stroke="#fbbf24" strokeWidth="2" />
        <path d={spendPath}  fill="none" stroke="#ec4899" strokeWidth="2" />
        {data.map((d, i) => (
          <text key={d.label + i} x={x(i)} y={h - 6} textAnchor="middle" fontSize="9" fill="#a78bfa">{d.label}</text>
        ))}
      </svg>
      <div className="flex gap-3 mt-2 text-[10px] text-muted-base">
        <span className="flex items-center gap-1.5"><span className="w-3 h-1 bg-amber-400" />Income</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-1 bg-pink-500" />Spent</span>
      </div>
    </div>
  );
}
