interface Props {
  total: number;
  arrived: number;
  expected: number;
  accent?: string;
}

const fmt = (n: number) => "$" + Math.round(n).toLocaleString("en-US");
const GRADIENT = "linear-gradient(90deg, #f59e0b 0%, #ec4899 100%)";

export function IncomeHero({ total, arrived, expected, accent = "#f59e0b" }: Props) {
  const pctArrived = total > 0 ? (arrived / total) * 100 : 0;

  return (
    <div
      style={{
        background: "#181028",
        border: "1px solid rgba(167,139,250,0.10)",
        borderRadius: 18,
        padding: 16,
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: 1,
          color: "#5e5279",
          textTransform: "uppercase",
        }}
      >
        Budget total
      </div>

      <div style={{ marginTop: 4 }}>
        <span
          style={{
            background: GRADIENT,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
            color: "transparent",
            fontVariantNumeric: "tabular-nums",
            fontSize: 38,
            fontWeight: 800,
            letterSpacing: -1,
            lineHeight: 1,
          }}
        >
          {fmt(total)}
        </span>
      </div>

      {/* stacked arrived / expected bar */}
      <div
        style={{
          marginTop: 14,
          height: 8,
          borderRadius: 999,
          background: "rgba(255,255,255,0.06)",
          overflow: "hidden",
          display: "flex",
        }}
      >
        <div style={{ width: `${pctArrived}%`, background: accent }} />
        <div
          style={{
            flex: 1,
            background: `repeating-linear-gradient(45deg, ${accent}59 0 6px, transparent 6px 12px)`,
          }}
        />
      </div>

      {/* legend */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 6,
          fontSize: 10,
          fontFamily: "var(--font-geist-mono, monospace)",
        }}
      >
        <span style={{ color: "#ede9f6" }}>
          <span style={{ color: accent }}>●</span> Arrived {fmt(arrived)}
        </span>
        <span style={{ color: "#8a7da8" }}>
          <span style={{ color: accent, opacity: 0.5 }}>▣</span> Expected +{fmt(expected)}
        </span>
      </div>
    </div>
  );
}
