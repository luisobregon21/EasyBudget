interface BucketItem {
  key: "savings" | "bills" | "wants";
  name: string;
  pct: number;    // allocation %
  alloc: number;  // dollar allocation
  spent: number;  // dollars spent
}

interface Props {
  buckets: BucketItem[];
}

const fmtCompact = (n: number) =>
  n >= 1000 ? "$" + (n / 1000).toFixed(n >= 10_000 ? 0 : 1) + "k" : "$" + Math.round(n);

const BUCKET_COLOR: Record<BucketItem["key"], string> = {
  savings: "#f59e0b",  // amber
  bills:   "#ec4899",  // pink
  wants:   "#a78bfa",  // violet
};

export function AllocationGrid({ buckets }: Props) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
      {buckets.map((b) => {
        const color    = BUCKET_COLOR[b.key];
        const fillPct  = b.alloc > 0 ? Math.min((b.spent / b.alloc) * 100, 100) : 0;
        const over     = b.spent > b.alloc;
        return (
          <div
            key={b.key}
            style={{
              background: "#181028",
              border: "1px solid rgba(167,139,250,0.13)",
              borderRadius: 14,
              padding: 11,
            }}
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
            <div
              style={{
                height: 3,
                background: "rgba(255,255,255,0.06)",
                borderRadius: 999,
                marginTop: 8,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${fillPct}%`,
                  background: over ? "#f87171" : color,
                  borderRadius: 999,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
