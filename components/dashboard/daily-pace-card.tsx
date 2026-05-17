interface Props {
  dailySpend: number[];  // one entry per past day (index 0 = day 1)
  daysInMonth: number;
  dayOfMonth: number;
  gradient?: string;
}

const fmt = (n: number) => "$" + Math.round(n).toLocaleString("en-US");
const GRADIENT = "linear-gradient(90deg, #f59e0b 0%, #ec4899 100%)";

export function DailyPaceCard({ dailySpend, daysInMonth, dayOfMonth, gradient = GRADIENT }: Props) {
  const spent   = dailySpend.reduce((s, v) => s + v, 0);
  const avg     = dayOfMonth > 0 ? spent / dayOfMonth : 0;
  const max     = Math.max(...dailySpend, 1);

  return (
    <div
      style={{
        background: "#181028",
        border: "1px solid rgba(167,139,250,0.13)",
        borderRadius: 14,
        padding: "14px 14px 12px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div>
          <div
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: 0.8,
              color: "#5e5279",
              textTransform: "uppercase",
            }}
          >
            Daily pace
          </div>
          <div
            style={{
              fontFamily: "var(--font-geist-mono, monospace)",
              fontSize: 26,
              fontWeight: 600,
              color: "#ede9f6",
              marginTop: 4,
              letterSpacing: -0.5,
              fontVariantNumeric: "tabular-nums",
              lineHeight: 1,
              whiteSpace: "nowrap",
            }}
          >
            {fmt(Math.round(avg))}
            <span style={{ fontSize: 11, color: "#8a7da8", fontWeight: 400, marginLeft: 4 }}>/day average</span>
          </div>
        </div>
      </div>

      {/* histogram */}
      <div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 48, position: "relative" }}>
          {/* dashed avg line */}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: max > 0 ? (avg / max) * 48 : 0,
              height: 1,
              borderTop: "1px dashed rgba(167,139,250,0.13)",
            }}
          />
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const v      = dailySpend[i] ?? 0;
            const future = dayNum > dayOfMonth;
            const barH   = future ? 4 : Math.max(2, (v / max) * 48);
            const bg     = future
              ? "rgba(255,255,255,0.04)"
              : v > avg
              ? gradient
              : "#f59e0b";
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: barH,
                  background: bg,
                  opacity: future ? 1 : v ? 1 : 0.3,
                  borderRadius: 1.5,
                }}
              />
            );
          })}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 6,
            fontSize: 9,
            color: "#5e5279",
            fontFamily: "var(--font-geist-mono, monospace)",
          }}
        >
          <span>day 1</span>
          <span>day {dayOfMonth}</span>
          <span>day {daysInMonth}</span>
        </div>
      </div>
    </div>
  );
}
