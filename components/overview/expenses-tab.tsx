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
  paymentMethod?: string | null;
}

interface Props {
  expenses: Expense[];
}

type Filter = "All" | "Today" | "This week" | "By category" | "By card";
const FILTERS: Filter[] = ["All", "Today", "This week", "By category", "By card"];

const fmtDec = (n: number) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const GRADIENT = "linear-gradient(90deg, #f59e0b 0%, #ec4899 100%)";

function ExpenseRow({ e, borderTop }: { e: Expense; borderTop: boolean }) {
  const icon = tagIcon(e.tagName ?? e.category);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "9px 12px",
        borderTop: borderTop ? "1px solid rgba(167,139,250,0.13)" : "none",
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
}

function GroupedList({ groups }: { groups: [string, Expense[]][] }) {
  return (
    <>
      {groups.map(([groupName, rows]) => (
        <div key={groupName}>
          <div
            style={{
              fontSize: 9.5,
              fontWeight: 700,
              letterSpacing: 1,
              color: "#8a7da8",
              textTransform: "uppercase",
              padding: "8px 12px 4px",
              borderTop: "1px solid rgba(167,139,250,0.13)",
            }}
          >
            {groupName}
          </div>
          {rows.map((e, i) => (
            <ExpenseRow key={e.id} e={e} borderTop={i > 0} />
          ))}
        </div>
      ))}
    </>
  );
}

export function ExpensesTab({ expenses }: Props) {
  const [activeFilter, setActiveFilter] = useState<Filter>("All");

  const today = new Date().toISOString().slice(0, 10);
  const weekStart = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  // Determine whether we render a flat list or grouped sections
  const isGrouped = activeFilter === "By category" || activeFilter === "By card";

  const filtered: Expense[] = (() => {
    if (activeFilter === "Today") return expenses.filter((e) => e.date === today);
    if (activeFilter === "This week") return expenses.filter((e) => e.date >= weekStart && e.date <= today);
    return expenses;
  })();

  const groups: [string, Expense[]][] = (() => {
    if (activeFilter === "By category") {
      const map = new Map<string, Expense[]>();
      for (const e of expenses) {
        const key = e.tagName ?? e.category ?? "Untagged";
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(e);
      }
      return Array.from(map.entries());
    }
    if (activeFilter === "By card") {
      const map = new Map<string, Expense[]>();
      for (const e of expenses) {
        const key = e.paymentMethod ?? "Cash";
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(e);
      }
      return Array.from(map.entries());
    }
    return [];
  })();

  const visibleForTotal = isGrouped ? expenses : filtered;
  const total = visibleForTotal.reduce((s, e) => s + e.amount, 0);
  const count = visibleForTotal.length;

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
          {count} expenses
        </div>
      </div>

      {/* filter chips */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
        {FILTERS.map((f) => {
          const active = f === activeFilter;
          return (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              style={{
                padding: "5px 11px",
                borderRadius: 999,
                fontSize: 10.5,
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
                background: active ? GRADIENT : "transparent",
                border: active ? "none" : "1px solid rgba(167,139,250,0.13)",
                color: active ? "#f59e0b" : "#8a7da8",
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
        {isGrouped ? (
          groups.length === 0 ? (
            <div style={{ padding: 14, textAlign: "center", color: "#5e5279", fontSize: 11 }}>
              No expenses yet
            </div>
          ) : (
            <GroupedList groups={groups} />
          )
        ) : (
          <>
            {filtered.length === 0 && (
              <div style={{ padding: 14, textAlign: "center", color: "#5e5279", fontSize: 11 }}>
                No expenses yet
              </div>
            )}
            {filtered.map((e, i) => (
              <ExpenseRow key={e.id} e={e} borderTop={i > 0} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
