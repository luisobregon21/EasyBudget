"use client";

interface Props {
  values: number[];
  up: boolean;
  width: number;
  height: number;
  thick?: boolean;
}

export function Sparkline({ values, up, width, height, thick }: Props) {
  if (values.length === 0) return null;
  const max = Math.max(...values) || 1;
  const min = Math.min(...values);
  const range = max - min || 1;
  const pad = thick ? 3 : 2;
  const innerH = height - pad * 2;
  const step = values.length === 1 ? 0 : width / (values.length - 1);
  const points = values.map((v, i) => [i * step, pad + innerH - ((v - min) / range) * innerH]);
  const color = up ? "#f87171" : "#34d399";
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = path + ` L${width},${height} L0,${height} Z`;
  const gradId = `sparkline-${width}-${height}-${up ? "up" : "down"}`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full block" preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <path d={path} fill="none" stroke={color} strokeWidth={thick ? 2.5 : 1.5} />
    </svg>
  );
}
