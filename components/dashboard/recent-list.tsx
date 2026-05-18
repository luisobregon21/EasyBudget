import Link from "next/link";
import { IconTile } from "@/components/ui/icon-tile";
import { tagIcon } from "@/lib/icons";

interface Expense {
  id: number;
  name: string;
  tagName?: string | null;
  category?: string | null;
  amount: number;
  date: string;
}

interface Props {
  expenses: Expense[];
}

const fmtDec = (n: number) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function RecentList({ expenses }: Props) {
  if (expenses.length === 0) {
    return (
      <div
        style={{
          background: "#181028",
          border: "1px solid rgba(167,139,250,0.13)",
          borderRadius: 14,
          padding: "24px 14px",
          textAlign: "center",
          color: "#8a7da8",
          fontSize: 12,
        }}
      >
        No expenses yet this month
      </div>
    );
  }

  return (
    <div
      style={{
        background: "#181028",
        border: "1px solid rgba(167,139,250,0.13)",
        borderRadius: 14,
        padding: "4px 0",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px 14px 6px",
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
          Recent
        </span>
        <span style={{ fontSize: 10.5, color: "#8a7da8" }}>{expenses.length} shown</span>
      </div>

      {expenses.map((e, i) => {
        const icon = tagIcon(e.tagName ?? e.category);
        return (
          <Link
            key={e.id}
            href={`/expenses/${e.id}/edit`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 11,
              padding: "8px 14px",
              borderTop: i ? "1px solid rgba(167,139,250,0.13)" : "none",
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <IconTile icon={icon} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, color: "#ede9f6", fontWeight: 500 }}>{e.name}</div>
              <div style={{ fontSize: 10, color: "#8a7da8", marginTop: 1 }}>
                {e.tagName ?? e.category ?? "Uncategorized"} · {e.date}
              </div>
            </div>
            <div
              style={{
                fontSize: 12.5,
                fontWeight: 600,
                color: "#ede9f6",
                fontFamily: "var(--font-geist-mono, monospace)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              −{fmtDec(e.amount)}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
