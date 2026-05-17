import Link from "next/link";

interface Props {
  spent: number;
  projected: number;
  income: number;
  billsDueCount: number;
}

const fmt = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

export function ContextStrip({ spent, projected, income, billsDueCount }: Props) {
  const projOver = projected > income;

  const items = [
    { label: "Spent",     value: fmt(spent),         sub: "this month",     href: "/trends",  tone: undefined },
    { label: "Projected", value: fmt(projected),     sub: projOver ? "over budget" : "on track", href: "/trends", tone: projOver ? "bad" : "good" },
    { label: "Income",    value: fmt(income),        sub: "budget",         href: "/income",  tone: undefined },
    { label: "Bills due", value: String(billsDueCount), sub: "this week",   href: "/bills",   tone: "warn" },
  ] as const;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        borderRadius: 14,
        padding: "11px 4px",
        background: "#181028",
        border: "1px solid rgba(167,139,250,0.13)",
      }}
    >
      {items.map((it, i) => {
        const color =
          it.tone === "bad"  ? "#f87171" :
          it.tone === "good" ? "#34d399" :
          it.tone === "warn" ? "#fbbf24" :
          "#ede9f6";
        return (
          <Link
            key={it.label}
            href={it.href}
            style={{
              padding: "2px 6px",
              textAlign: "left",
              color: "#ede9f6",
              borderRight: i < 3 ? "1px solid rgba(167,139,250,0.13)" : "none",
              display: "flex",
              flexDirection: "column",
              gap: 2,
              textDecoration: "none",
            }}
          >
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", color: "#5e5279" }}>
              {it.label}
            </span>
            <span
              style={{
                fontFamily: "var(--font-geist-mono, monospace)",
                fontSize: 14,
                fontWeight: 600,
                lineHeight: 1,
                color,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {it.value}
            </span>
            <span style={{ fontSize: 9, color: "#5e5279", lineHeight: 1.1 }}>{it.sub}</span>
          </Link>
        );
      })}
    </div>
  );
}
