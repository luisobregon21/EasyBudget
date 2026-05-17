"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Receipt } from "lucide-react";

type BillStatus = "overdue" | "due-soon" | "upcoming" | "paid";

interface Bill {
  id: number;
  name: string;
  type: string;
  day: number;
  status: BillStatus;
  amount: number;
}

interface Props {
  year: number;
  month: number;
  billDays: number[];
  bills: Bill[];
}

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const GRADIENT = "linear-gradient(90deg, #f59e0b 0%, #ec4899 100%)";

function buildCalendar(year: number, month: number) {
  const firstDay  = new Date(year, month - 1, 1).getDay(); // 0=Sun
  const totalDays = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return { cells, totalDays };
}

function fmtDec(n: number) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function BillsCalendar({ year, month, billDays, bills }: Props) {
  const router      = useRouter();
  const pathname    = usePathname();
  const searchParams = useSearchParams();
  const { cells, totalDays } = buildCalendar(year, month);
  const today       = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;
  const todayDay    = isCurrentMonth ? today.getDate() : -1;

  const totalDue = bills
    .filter((b) => b.status !== "paid")
    .reduce((s, b) => s + b.amount, 0);

  const upcoming = bills
    .filter((b) => b.status !== "paid" && b.day >= (isCurrentMonth ? todayDay : 1))
    .sort((a, b) => a.day - b.day);

  function navigate(y: number, m: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("year",  String(y));
    params.set("month", String(m));
    router.push(`${pathname}?${params.toString()}`);
  }

  function prevMonth() {
    if (month === 1) navigate(year - 1, 12);
    else navigate(year, month - 1);
  }
  function nextMonth() {
    if (month === 12) navigate(year + 1, 1);
    else navigate(year, month + 1);
  }

  // build pill months: prev, current, next
  const pillMonths = [
    month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 },
    { y: year, m: month },
    month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* header */}
      <div>
        <div style={{ fontSize: 11, color: "#8a7da8", fontWeight: 600 }}>
          {MONTH_NAMES[month - 1]} bills due
        </div>
        <div
          style={{
            fontSize: 32,
            fontWeight: 800,
            letterSpacing: -1,
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
          {fmtDec(totalDue)}
        </div>
      </div>

      {/* calendar grid */}
      <div
        style={{
          background: "#181028",
          border: "1px solid rgba(167,139,250,0.13)",
          borderRadius: 12,
          padding: 10,
        }}
      >
        {/* weekday headers */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: 4,
            textAlign: "center",
            fontSize: 8.5,
            color: "#5e5279",
            fontFamily: "var(--font-geist-mono, monospace)",
            marginBottom: 4,
          }}
        >
          {["S","M","T","W","T","F","S"].map((d, i) => <span key={i}>{d}</span>)}
        </div>

        {/* day cells */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
          {cells.map((d, i) => {
            if (d === null) return <span key={i} />;
            const hasBill = billDays.includes(d);
            const isPast  = d < todayDay;
            const isToday = d === todayDay;
            return (
              <div
                key={i}
                style={{
                  aspectRatio: "1 / 1",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10.5,
                  fontFamily: "var(--font-geist-mono, monospace)",
                  color: hasBill ? "#fff" : isPast ? "#5e5279" : "#ede9f6",
                  background: hasBill && !isPast ? GRADIENT
                            : hasBill && isPast ? "rgba(167,139,250,0.20)"
                            : "transparent",
                  borderRadius: 999,
                  border: isToday ? "1.5px solid #f59e0b" : "none",
                  fontWeight: hasBill || isToday ? 700 : 500,
                }}
              >
                {d}
              </div>
            );
          })}
        </div>

        {/* legend */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 12,
            marginTop: 10,
            fontSize: 9,
            color: "#5e5279",
            fontFamily: "var(--font-geist-mono, monospace)",
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, border: "1.5px solid #f59e0b", display: "inline-block" }} /> Today
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: GRADIENT, display: "inline-block" }} /> Bill due
          </span>
        </div>
      </div>

      {/* month switcher pills */}
      <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
        {pillMonths.map((pm, i) => {
          const active = i === 1;
          return (
            <button
              key={i}
              onClick={() => navigate(pm.y, pm.m)}
              style={{
                padding: "5px 14px",
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                background: active ? "rgba(245,158,11,0.15)" : "transparent",
                border: active ? "1px solid #f59e0b" : "1px solid rgba(167,139,250,0.13)",
                color: active ? "#f59e0b" : "#8a7da8",
              }}
            >
              {MONTH_SHORT[pm.m - 1]}
            </button>
          );
        })}
      </div>

      {/* upcoming bills list */}
      <div>
        <div
          style={{
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: 1,
            color: "#5e5279",
            textTransform: "uppercase",
            marginBottom: 6,
            padding: "0 4px",
          }}
        >
          Upcoming
        </div>
        <div
          style={{
            background: "#181028",
            border: "1px solid rgba(167,139,250,0.13)",
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          {upcoming.length === 0 && (
            <div
              style={{
                padding: 14,
                textAlign: "center",
                color: "#5e5279",
                fontSize: 11,
              }}
            >
              All bills paid this month!
            </div>
          )}
          {upcoming.map((b, i) => (
            <div
              key={b.id}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "9px 12px",
                borderTop: i ? "1px solid rgba(167,139,250,0.13)" : "none",
              }}
            >
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 6,
                  background: "rgba(167,139,250,0.10)",
                  color: "#c4b5fd",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 10,
                  flexShrink: 0,
                }}
              >
                <Receipt size={13} />
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
                  {b.name}
                </div>
                <div
                  style={{
                    fontSize: 9.5,
                    color: "#8a7da8",
                    fontFamily: "var(--font-geist-mono, monospace)",
                  }}
                >
                  {MONTH_SHORT[month - 1]} {b.day}
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
                {fmtDec(b.amount)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
