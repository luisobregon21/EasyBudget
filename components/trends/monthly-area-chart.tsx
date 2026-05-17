"use client";
import type { TrendPoint } from "@/lib/actions/trends";

type ChartStyle = "area" | "line" | "bar";

interface Props {
  data: TrendPoint[];
  style?: ChartStyle;
  /** Optional projected spend for the last (partial) month */
  projected?: number;
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

export function MonthlyAreaChart({ data, style = "area", projected }: Props) {
  if (data.length === 0) {
    return (
      <p className="text-muted-base text-sm text-center py-8">
        Not enough data for a trend yet. Add income and expenses to see your history.
      </p>
    );
  }

  const rawMax = Math.max(...data.map((d) => Math.max(d.income, d.spent)), projected ?? 0) || 1;
  const max    = niceMax(rawMax * 1.05);

  const w = 600, h = 180;
  const padL = 44, padR = 8, padT = 8, padB = 22;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;
  const step  = data.length === 1 ? 0 : plotW / (data.length - 1);
  const ticks = [0, max / 4, max / 2, (3 * max) / 4, max];
  const X = (i: number) => padL + i * step;
  const Y = (v: number) => padT + plotH - (v / max) * plotH;

  const incomePath = data.map((d, i) => `${i === 0 ? "M" : "L"}${X(i).toFixed(1)},${Y(d.income).toFixed(1)}`).join(" ");
  const spendPath  = data.map((d, i) => `${i === 0 ? "M" : "L"}${X(i).toFixed(1)},${Y(d.spent).toFixed(1)}`).join(" ");

  const baseY      = padT + plotH;
  const incomeArea = incomePath + ` L${X(data.length - 1)},${baseY} L${X(0)},${baseY} Z`;
  const spendArea  = spendPath  + ` L${X(data.length - 1)},${baseY} L${X(0)},${baseY} Z`;

  const lastIdx      = data.length - 1;
  const lastSpentY   = Y(data[lastIdx].spent);
  const projectedY   = projected !== undefined ? Y(projected) : null;
  const projExtX     = X(lastIdx) + 4; // tiny offset so it's visibly separate

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full block">
        <defs>
          <linearGradient id="ma-income" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="ma-spend" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ec4899" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#ec4899" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* grid lines */}
        {ticks.map((t, i) => {
          const ty = Y(t);
          return (
            <g key={i}>
              <line x1={padL} x2={w - padR} y1={ty} y2={ty} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
              <text x={padL - 6} y={ty + 3} textAnchor="end" fontSize="9" fill="#a78bfa">{formatTick(t)}</text>
            </g>
          );
        })}

        {/* ─── Bar mode ─────────────────────────────────── */}
        {style === "bar" && (() => {
          // Cap bar width so a 2-3-month chart doesn't blow up to 80px wide bars.
          // 18px is comfortable; scale down for dense charts.
          const bw = Math.min(18, step * 0.32);
          const gap = 2;
          return data.map((d, i) => (
            <g key={i}>
              <rect
                x={X(i) - bw - gap / 2} y={Y(d.income)}
                width={bw} height={plotH - (Y(d.income) - padT)}
                fill="#f59e0b" opacity={0.85} rx={1}
              />
              <rect
                x={X(i) + gap / 2} y={Y(d.spent)}
                width={bw} height={plotH - (Y(d.spent) - padT)}
                fill="#ec4899" opacity={0.85} rx={1}
              />
            </g>
          ));
        })()}

        {/* ─── Line mode ────────────────────────────────── */}
        {style === "line" && (
          <>
            <path d={incomePath} fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d={spendPath}  fill="none" stroke="#ec4899" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}

        {/* ─── Area mode (default) ──────────────────────── */}
        {style === "area" && (
          <>
            <path d={incomeArea} fill="url(#ma-income)" />
            <path d={spendArea}  fill="url(#ma-spend)"  />
            <path d={incomePath} fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d={spendPath}  fill="none" stroke="#ec4899" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}

        {/* ─── Projection extension (dashed line + open circle) ── */}
        {projectedY !== null && (
          <>
            <line
              x1={X(lastIdx)} y1={lastSpentY}
              x2={projExtX}   y2={projectedY}
              stroke="#ec4899" strokeWidth="1.5" strokeDasharray="2 2"
            />
            <circle
              cx={projExtX} cy={projectedY}
              r="3" fill="none"
              stroke="#ec4899" strokeWidth="1.5"
            />
          </>
        )}

        {/* x-axis labels */}
        {data.map((d, i) => (
          <text
            key={d.label + i}
            x={X(i)} y={h - 6}
            textAnchor="middle" fontSize="9" fill="#a78bfa"
          >
            {d.label}
          </text>
        ))}
      </svg>

      <div className="flex gap-3 mt-2 text-[10px] text-muted-base">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-1 bg-amber-400 inline-block" /> Income
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-1 bg-pink-500 inline-block" /> Spent
        </span>
        {projectedY !== null && (
          <span className="flex items-center gap-1.5 ml-auto">
            <span className="w-3 h-0 border-t border-dashed border-pink-500 inline-block" /> Projected
          </span>
        )}
      </div>
    </div>
  );
}
