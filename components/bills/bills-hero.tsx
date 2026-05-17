import { AlertCircle } from "lucide-react";

interface BillMarker {
  day: number;
  status: "overdue" | "due-soon" | "upcoming" | "paid";
}

interface Props {
  totalDue: number;
  overdueCount: number;
  overdueTotal: number;
  dueSoonTotal: number;
  upcomingTotal: number;
  bills: BillMarker[];
  dayOfMonth: number;
  daysInMonth: number;
}

const fmt = (n: number) => "$" + Math.round(n).toLocaleString("en-US");
const GRADIENT = "linear-gradient(90deg, #f59e0b 0%, #ec4899 100%)";

export function BillsHero({
  totalDue,
  overdueCount,
  overdueTotal,
  dueSoonTotal,
  upcomingTotal,
  bills,
  dayOfMonth,
  daysInMonth,
}: Props) {
  return (
    <div
      style={{
        background: "#181028",
        border: "1px solid rgba(167,139,250,0.10)",
        borderRadius: 18,
        padding: 16,
      }}
    >
      {/* top row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 1,
              color: "#5e5279",
              textTransform: "uppercase",
            }}
          >
            Outstanding
          </div>
          <div style={{ marginTop: 2 }}>
            <span
              style={{
                background: GRADIENT,
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                WebkitTextFillColor: "transparent",
                color: "transparent",
                fontVariantNumeric: "tabular-nums",
                fontSize: 34,
                fontWeight: 800,
                letterSpacing: -1,
                lineHeight: 1,
              }}
            >
              {fmt(totalDue)}
            </span>
          </div>
          <div
            style={{
              fontSize: 11,
              color: "#8a7da8",
              marginTop: 4,
              fontFamily: "var(--font-geist-mono, monospace)",
            }}
          >
            across {bills.length} bills
          </div>
        </div>

        {overdueCount > 0 && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "3px 9px",
              borderRadius: 999,
              fontSize: 10.5,
              fontWeight: 600,
              letterSpacing: 0.2,
              background: "rgba(248,113,113,0.12)",
              color: "#f87171",
              border: "1px solid rgba(248,113,113,0.30)",
              fontFamily: "var(--font-geist-mono, monospace)",
            }}
          >
            <AlertCircle size={11} /> {overdueCount} overdue
          </span>
        )}
      </div>

      {/* due-date timeline */}
      <div style={{ marginTop: 14 }}>
        <div
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: 0.8,
            color: "#5e5279",
            textTransform: "uppercase",
            marginBottom: 6,
          }}
        >
          Due dates this month
        </div>
        <div
          style={{
            position: "relative",
            height: 28,
            background: "rgba(255,255,255,0.04)",
            borderRadius: 6,
          }}
        >
          {/* today line */}
          <div
            style={{
              position: "absolute",
              left: `${(dayOfMonth / daysInMonth) * 100}%`,
              top: -3,
              bottom: -3,
              width: 1,
              background: "#ede9f6",
              opacity: 0.5,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: `${(dayOfMonth / daysInMonth) * 100}%`,
              top: -14,
              transform: "translateX(-50%)",
              fontSize: 8,
              color: "#8a7da8",
              fontFamily: "var(--font-geist-mono, monospace)",
              letterSpacing: 0.5,
            }}
          >
            today
          </div>

          {/* bill markers */}
          {bills.map((b, i) => {
            const left  = (b.day / daysInMonth) * 100;
            const color =
              b.status === "overdue"  ? "#f87171" :
              b.status === "due-soon" ? "#fbbf24" :
              b.status === "paid"     ? "#8a7da8" :
              "#ede9f6";
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: `${left}%`,
                  top: 4,
                  bottom: 4,
                  width: 3,
                  background: color,
                  transform: "translateX(-50%)",
                  opacity: b.status === "paid" ? 0.35 : 1,
                  borderRadius: 1,
                }}
              />
            );
          })}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 5,
            fontFamily: "var(--font-geist-mono, monospace)",
            fontSize: 9,
            color: "#5e5279",
          }}
        >
          <span>1</span>
          <span>15</span>
          <span>{daysInMonth}</span>
        </div>
      </div>

      {/* breakdown chips */}
      <div
        style={{
          display: "flex",
          gap: 6,
          marginTop: 14,
          fontSize: 10,
          fontFamily: "var(--font-geist-mono, monospace)",
        }}
      >
        <div
          style={{
            flex: 1,
            padding: "8px 10px",
            background: "rgba(248,113,113,0.08)",
            border: "1px solid rgba(248,113,113,0.2)",
            borderRadius: 9,
          }}
        >
          <div style={{ color: "#f87171", fontSize: 11, fontWeight: 600 }}>{fmt(overdueTotal)}</div>
          <div style={{ color: "#5e5279", marginTop: 1 }}>overdue</div>
        </div>
        <div
          style={{
            flex: 1,
            padding: "8px 10px",
            background: "rgba(245,158,11,0.08)",
            border: "1px solid rgba(245,158,11,0.2)",
            borderRadius: 9,
          }}
        >
          <div style={{ color: "#fbbf24", fontSize: 11, fontWeight: 600 }}>{fmt(dueSoonTotal)}</div>
          <div style={{ color: "#5e5279", marginTop: 1 }}>this week</div>
        </div>
        <div
          style={{
            flex: 1,
            padding: "8px 10px",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(167,139,250,0.13)",
            borderRadius: 9,
          }}
        >
          <div style={{ color: "#ede9f6", fontSize: 11, fontWeight: 600 }}>{fmt(upcomingTotal)}</div>
          <div style={{ color: "#5e5279", marginTop: 1 }}>upcoming</div>
        </div>
      </div>
    </div>
  );
}
