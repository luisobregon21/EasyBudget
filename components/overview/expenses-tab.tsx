"use client";

import { useState } from "react";
import { IconTile } from "@/components/ui/icon-tile";
import { tagIcon } from "@/lib/icons";

interface Expense {
  id: number;
  name: string;
  category?: string | null;
  tagName?: string | null;
  amount: number;
  date: string;
}

interface Props {
  expenses: Expense[];
}

type Filter = "All" | "Today" | "This week" | "By category" | "By card";
const FILTERS: Filter[] = ["All", "Today", "This week", "By category", "By card"];

const fmtDec = (n: number) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const GRADIENT = "linear-gradient(90deg, #f59e0b 0%, #ec4899 100%)";

export function ExpensesTab({ expenses }: Props) {
  const [activeFilter, setActiveFilter] = useState<Filter>("All");

  // In V1 only "All" is functional; others are rendered but don't filter
  const visible = expenses;
  const total   = visible.reduce((s, e) => s + e.amount, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* hero */}
      <div>
        <div style={{ fontSize: 11, color: "#8a7da8", fontWeight: 600 }}>Recent expenses</div>
        <div
          style={{
            fontSize: 28,
            fontWeight: 800,
            letterSpacing: -0.8,
            lineHeight: 1,
            marginTop: 2,
            fontFamily: "var(--font-geist-mono, monospace)",
            fontVariantNumeric: "tabular-nums",
            background: GRADIENT,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          {fmtDec(total)}
        </div>
        <div
          style={{
            fontSize: 10,
            color: "#5e5279",
            fontFamily: "var(--font-geist-mono, monospace)",
            marginTop: 2,
          }}
        >
          {visible.length} expenses
        </div>
      </div>

      {/* filter chips */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
        {FILTERS.map((f) => {
          const active = f === activeFilter;
          const isDisabled = f !== "All";
          return (
            <button
              key={f}
              onClick={() => { if (!isDisabled) setActiveFilter(f); }}
              style={{
                padding: "5px 11px",
                borderRadius: 999,
                fontSize: 10.5,
                fontWeight: 600,
                cursor: isDisabled ? "default" : "pointer",
                whiteSpace: "nowrap",
                background: active ? "rgba(245,158,11,0.15)" : "transparent",
                border: active ? "1px solid #f59e0b" : "1px solid rgba(167,139,250,0.13)",
                color: active ? "#f59e0b" : isDisabled ? "#3d3459" : "#8a7da8",
                opacity: isDisabled ? 0.5 : 1,
              }}
            >
              {f}
            </button>
          );
        })}
      </div>

      {/* expense list */}
      <div
        style={{
          background: "#181028",
          border: "1px solid rgba(167,139,250,0.13)",
          borderRadius: 10,
          overflow: "hidden",
        }}
      >
        {visible.length === 0 && (
          <div style={{ padding: 14, textAlign: "center", color: "#5e5279", fontSize: 11 }}>
            No expenses yet
          </div>
        )}
        {visible.map((e, i) => {
          const icon = tagIcon(e.tagName ?? e.category);
          return (
            <div
              key={e.id}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "9px 12px",
                borderTop: i ? "1px solid rgba(167,139,250,0.13)" : "none",
              }}
            >
              <div style={{ marginRight: 10, flexShrink: 0 }}>
                <IconTile icon={icon} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 11.5,
                    color: "#ede9f6",
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {e.name}
                </div>
                <div
                  style={{
                    fontSize: 9.5,
                    color: "#8a7da8",
                    fontFamily: "var(--font-geist-mono, monospace)",
                  }}
                >
                  {e.tagName ?? e.category ?? "Uncategorized"} · {e.date}
                </div>
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#ede9f6",
                  fontFamily: "var(--font-geist-mono, monospace)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                −{fmtDec(e.amount)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
