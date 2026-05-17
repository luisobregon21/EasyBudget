import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

interface Props {
  obligated: number;
  leftover: number;
}

const fmt = (n: number) => "$" + Math.round(n).toLocaleString("en-US");
const GRADIENT = "linear-gradient(90deg, #f59e0b 0%, #ec4899 100%)";

export function GoesToCard({ obligated, leftover }: Props) {
  return (
    <div
      style={{
        background: "rgba(167,139,250,0.05)",
        border: "1px solid rgba(167,139,250,0.13)",
        borderRadius: 14,
        padding: 14,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 1,
            color: "#5e5279",
            textTransform: "uppercase",
          }}
        >
          Goes to →
        </span>
        <Link
          href="/bills"
          style={{
            color: "#8a7da8",
            fontSize: 10.5,
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 2,
          }}
        >
          Bills <ArrowUpRight size={11} />
        </Link>
      </div>

      <div style={{ fontSize: 12.5, color: "#ede9f6", lineHeight: 1.5 }}>
        After bills{" "}
        <span
          style={{
            fontFamily: "var(--font-geist-mono, monospace)",
            color: "#ec4899",
          }}
        >
          {fmt(obligated)}
        </span>{" "}
        you&apos;ll have{" "}
        <span
          style={{
            background: GRADIENT,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
            color: "transparent",
            fontFamily: "var(--font-geist-mono, monospace)",
            fontWeight: 600,
          }}
        >
          {fmt(leftover)}
        </span>{" "}
        left for savings + wants.
      </div>
    </div>
  );
}
