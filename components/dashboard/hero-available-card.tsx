import { CheckCircle2, TrendingUp } from "lucide-react";

interface Props {
  remaining: number;
  total: number;
  spent: number;
  projected: number;
  dayPct: number;   // 0-100, how far through the month today is
  onTrack: boolean;
}

const fmt = (n: number) => "$" + Math.round(n).toLocaleString("en-US");
const GRADIENT = "linear-gradient(90deg, #f59e0b 0%, #ec4899 100%)";
const HERO_GLOW =
  "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(245,158,11,0.08), transparent 70%), " +
  "radial-gradient(ellipse 60% 40% at 50% 100%, rgba(236,72,153,0.10), transparent 70%)";

export function HeroAvailableCard({ remaining, total, spent, projected, dayPct, onTrack }: Props) {
  const pctUsed  = total > 0 ? (spent     / total) * 100 : 0;
  const projPct  = total > 0 ? (projected / total) * 100 : 0;

  return (
    <div
      style={{
        background: "#181028",
        border: "1px solid rgba(167,139,250,0.10)",
        borderRadius: 18,
        padding: 16,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* glow */}
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: 160,
          height: 160,
          background: HERO_GLOW,
          pointerEvents: "none",
        }}
      />

      {/* top row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "#5e5279", textTransform: "uppercase" }}>
            Available to spend
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
                fontSize: 38,
                fontWeight: 800,
                letterSpacing: -1,
                lineHeight: 1,
              }}
            >
              {fmt(remaining)}
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
            of {fmt(total)} budget · {Math.round(pctUsed)}% used
          </div>
        </div>

        {/* on-pace pill */}
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
            background: onTrack ? "rgba(52,211,153,0.12)" : "rgba(248,113,113,0.12)",
            color:      onTrack ? "#34d399"               : "#f87171",
            border:     onTrack ? "1px solid rgba(52,211,153,0.30)" : "1px solid rgba(248,113,113,0.30)",
            fontFamily: "var(--font-geist-mono, monospace)",
          }}
        >
          {onTrack ? <CheckCircle2 size={11} /> : <TrendingUp size={11} />}
          {onTrack ? "On pace" : "Off pace"}
        </span>
      </div>

      {/* dual progress bar */}
      <div style={{ marginTop: 14 }}>
        <div
          style={{
            height: 6,
            background: "rgba(255,255,255,0.06)",
            borderRadius: 999,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* projection ghost */}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              height: "100%",
              width: `${Math.min(projPct, 100)}%`,
              background: GRADIENT,
              opacity: 0.25,
              borderRadius: 999,
            }}
          />
          {/* actual spend */}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              height: "100%",
              width: `${Math.min(pctUsed, 100)}%`,
              background: GRADIENT,
              borderRadius: 999,
            }}
          />
          {/* today marker */}
          <div
            style={{
              position: "absolute",
              left: `${dayPct}%`,
              top: -2,
              height: 10,
              width: 1,
              background: "#ede9f6",
              opacity: 0.5,
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 6,
            fontSize: 9.5,
            color: "#8a7da8",
            fontFamily: "var(--font-geist-mono, monospace)",
          }}
        >
          <span>
            <span style={{ color: "#ede9f6" }}>{fmt(spent)}</span> spent · {fmt(remaining)} left
          </span>
          <span>proj {fmt(projected)}</span>
        </div>
      </div>
    </div>
  );
}
