import Link from "next/link";

interface BucketItem {
  key: "savings" | "bills" | "wants";
  name: string;
  pct: number;    // allocation %
  alloc: number;  // dollar allocation
  spent: number;  // dollars spent
  expected?: number; // projected end-of-month spend
}

interface Props {
  buckets: BucketItem[];
  /** Optional context for drill-down link (defaults to current month if omitted) */
  year?: number;
  month?: number;
}

const fmtCompact = (n: number) =>
  n >= 1000 ? "$" + (n / 1000).toFixed(n >= 10_000 ? 0 : 1) + "k" : "$" + Math.round(n);

const BUCKET_COLOR: Record<BucketItem["key"], string> = {
  savings: "#f59e0b",  // amber
  bills:   "#ec4899",  // pink
  wants:   "#a78bfa",  // violet
};

export function AllocationGrid({ buckets, year, month }: Props) {
  function drillHref(key: BucketItem["key"]) {
    const sp = new URLSearchParams({ bucket: key });
    if (year)  sp.set("year",  String(year));
    if (month) sp.set("month", String(month));
    return `/expenses?${sp.toString()}`;
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
      {buckets.map((b) => {
        const color      = BUCKET_COLOR[b.key];
        const fillPct    = b.alloc > 0 ? Math.min((b.spent / b.alloc) * 100, 100) : 0;
        const over       = b.spent > b.alloc;
        const expected   = b.expected ?? b.spent;
        // ghost bar: from actual → projected (only when projected > actual)
        const ghostStart = b.alloc > 0 ? Math.min((b.spent / b.alloc) * 100, 100) : 0;
        const ghostEnd   = b.alloc > 0 ? Math.min((expected / b.alloc) * 100, 100) : 0;
        const ghostWidth = Math.max(0, ghostEnd - ghostStart);
        const ghostOver  = expected > b.alloc;
        const showGhost  = expected > b.spent && ghostWidth > 0;

        return (
          <Link
            key={b.key}
            href={drillHref(b.key)}
            style={{
              display: "block",
              background: "#181028",
              border: "1px solid rgba(167,139,250,0.13)",
              borderRadius: 14,
              padding: 11,
              textDecoration: "none",
              color: "inherit",
              transition: "background 0.15s",
            }}
            className="hover:bg-white/[0.04]"
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.8, color, textTransform: "uppercase" }}>
                {b.name}
              </span>
              <span style={{ fontSize: 9, color: "#5e5279", fontFamily: "var(--font-geist-mono, monospace)" }}>
                {b.pct}%
              </span>
            </div>
            <div
              style={{
                fontSize: 17,
                fontWeight: 700,
                color: "#ede9f6",
                marginTop: 4,
                fontFamily: "var(--font-geist-mono, monospace)",
                letterSpacing: -0.3,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {fmtCompact(b.spent)}
            </div>
            <div
              style={{
                fontSize: 9.5,
                color: "#8a7da8",
                marginTop: 1,
                fontFamily: "var(--font-geist-mono, monospace)",
              }}
            >
              / {fmtCompact(b.alloc)}
            </div>

            {/* bar: solid actual + ghost projected */}
            <div
              style={{
                height: 3,
                background: "rgba(255,255,255,0.06)",
                borderRadius: 999,
                marginTop: 8,
                overflow: "hidden",
                position: "relative",
              }}
            >
              {/* solid actual fill */}
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  height: "100%",
                  width: `${fillPct}%`,
                  background: over ? "#f87171" : color,
                  borderRadius: 999,
                }}
              />
              {/* ghost extension for projected */}
              {showGhost && (
                <div
                  style={{
                    position: "absolute",
                    left: `${ghostStart}%`,
                    top: 0,
                    height: "100%",
                    width: `${ghostWidth}%`,
                    background: ghostOver ? "rgba(248,113,113,0.4)" : color,
                    opacity: 0.35,
                    borderRadius: 999,
                  }}
                />
              )}
            </div>

            {/* expected label */}
            <div
              style={{
                fontSize: 8.5,
                color: "#5e5279",
                marginTop: 5,
                fontFamily: "var(--font-geist-mono, monospace)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              <span style={{ color: "#8a7da8" }}>exp </span>
              {fmtCompact(expected)}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
