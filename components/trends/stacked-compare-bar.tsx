"use client";

interface Props {
  currentLabel: string;
  previousLabel: string;
  current: { savings: number; bills: number; wants: number };
  previous: { savings: number; bills: number; wants: number };
}

const BUCKET_COLOR: Record<"savings" | "bills" | "wants", string> = {
  savings: "#f59e0b",
  bills:   "#ec4899",
  wants:   "#a78bfa",
};

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

export function StackedCompareBar({ currentLabel, previousLabel, current, previous }: Props) {
  const sumCurrent  = current.savings + current.bills + current.wants;
  const sumPrevious = previous.savings + previous.bills + previous.wants;
  const max = niceMax(Math.max(sumCurrent, sumPrevious) * 1.1 || 1);

  const w = 400, h = 220;
  const padL = 44, padR = 16, padT = 12, padB = 38;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;
  const barW = 80;
  const gap = 60;
  // Center the pair horizontally within plot area
  const totalW = barW * 2 + gap;
  const startX = padL + (plotW - totalW) / 2;

  const ticks = [0, max / 4, max / 2, (3 * max) / 4, max];
  const Y = (v: number) => padT + plotH - (v / max) * plotH;

  function StackedBar({ x, label, vals }: { x: number; label: string; vals: { savings: number; bills: number; wants: number } }) {
    const total = vals.savings + vals.bills + vals.wants;
    // Stack bottom-to-top: savings → bills → wants
    let acc = 0;
    const segs = (["savings", "bills", "wants"] as const).map((b) => {
      const v = vals[b];
      const segH = v > 0 ? (v / max) * plotH : 0;
      const y = Y(acc + v);
      acc += v;
      return { b, v, segH, y };
    });
    return (
      <g>
        {segs.map((s) => s.v > 0 && (
          <rect
            key={s.b}
            x={x} y={s.y}
            width={barW} height={s.segH}
            fill={BUCKET_COLOR[s.b]} opacity={0.88}
            rx={1}
          />
        ))}
        <text
          x={x + barW / 2} y={h - 18}
          textAnchor="middle" fontSize="10.5" fill="#ede9f6" fontWeight={600}
        >
          {label}
        </text>
        <text
          x={x + barW / 2} y={h - 6}
          textAnchor="middle" fontSize="9" fill="#a78bfa"
          fontFamily="var(--font-geist-mono, monospace)"
        >
          ${Math.round(total).toLocaleString()}
        </text>
      </g>
    );
  }

  if (sumCurrent === 0 && sumPrevious === 0) {
    return (
      <div className="rounded-2xl bg-white/[0.03] border border-accent-purple/13 p-4 text-center text-muted-base text-sm">
        No spending in either period to compare.
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white/[0.03] border border-accent-purple/13 p-4">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full block">
        {/* gridlines */}
        {ticks.map((t, i) => {
          const ty = Y(t);
          return (
            <g key={i}>
              <line x1={padL} x2={w - padR} y1={ty} y2={ty} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
              <text x={padL - 6} y={ty + 3} textAnchor="end" fontSize="9" fill="#a78bfa">{formatTick(t)}</text>
            </g>
          );
        })}
        <StackedBar x={startX}              label={previousLabel} vals={previous} />
        <StackedBar x={startX + barW + gap} label={currentLabel}  vals={current} />
      </svg>
      <div className="flex gap-3 mt-2 text-[10px] text-muted-base justify-center">
        <span className="flex items-center gap-1.5"><span className="w-3 h-1 inline-block" style={{ background: BUCKET_COLOR.savings }} /> Savings</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-1 inline-block" style={{ background: BUCKET_COLOR.bills   }} /> Bills</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-1 inline-block" style={{ background: BUCKET_COLOR.wants   }} /> Personal</span>
      </div>
    </div>
  );
}
