"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
// Live preview of the "Refined Hybrid" design from the Claude Design handoff bundle.
// Hardcoded seed data; no DB. Toggle color scheme in the top-right.
// DELETE THIS ROUTE after the real implementation lands.

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import {
  Home as IconHome, Wallet, Receipt, PieChart, Plus, X, ChevronLeft, ChevronRight,
  AlertCircle, CheckCircle2, Calendar, ArrowUpRight, TrendingUp, TrendingDown,
  Coffee, ShoppingBag, UtensilsCrossed, Car, Film, Landmark, CreditCard, Wifi,
  Heart, Briefcase, Activity,
} from "lucide-react";

// ─── Seed data (May 16, 2026) ─────────────────────────────────────────────
const TODAY = new Date(2026, 4, 16);
const MONTH_LABEL = "May 2026";
const DAY_OF_MONTH = TODAY.getDate();
const DAYS_IN_MONTH = 31;

const BUDGET = {
  arrived: 5400, expected: 1400, total: 6800, opening: 1250,
  spent: 3425,
  savingsPct: 20, billsPct: 70, wantsPct: 10,
  byBucket: { savings: 400, bills: 2640, wants: 385 },
};
const DAILY_SPEND = [
  120, 1880, 45, 82, 18, 64, 195,
  30, 88, 122, 48, 72, 145, 39,
  95, 68,
];
const PROJECTED_TOTAL = Math.round((BUDGET.spent / DAY_OF_MONTH) * DAYS_IN_MONTH);

const TREND_6MO = [
  { label: "Dec", income: 6800, spent: 4980 },
  { label: "Jan", income: 6500, spent: 5210 },
  { label: "Feb", income: 6800, spent: 4890 },
  { label: "Mar", income: 6800, spent: 5520 },
  { label: "Apr", income: 6800, spent: 5180 },
  { label: "May", income: 6800, spent: 3425, partial: true },
];

const INCOME_ENTRIES = [
  { id: 1, source: "Salary — Acme Co.", amount: 2700, date: "May 1", status: "arrived" as const },
  { id: 2, source: "Salary — Acme Co.", amount: 2700, date: "May 15", status: "arrived" as const },
  { id: 3, source: "Freelance — Lumen.io", amount: 1400, date: "May 25", status: "expected" as const },
];

type BillStatus = "overdue" | "due-soon" | "upcoming" | "paid";
const BILLS: { id: number; name: string; amount: number; type: keyof typeof BILL_ICON; day: number; status: BillStatus }[] = [
  { id: 1, name: "Internet — Comcast", amount: 59.99, type: "utility", day: 14, status: "overdue" },
  { id: 2, name: "Spotify Family", amount: 16.99, type: "subscription", day: 18, status: "due-soon" },
  { id: 3, name: "Electric — PG&E", amount: 128.40, type: "utility", day: 21, status: "due-soon" },
  { id: 4, name: "Rent — 1408 Hayes", amount: 1850, type: "utility", day: 2, status: "paid" },
  { id: 5, name: "Capital One", amount: 342.18, type: "credit_card", day: 28, status: "upcoming" },
  { id: 6, name: "Chase Sapphire", amount: 186.55, type: "credit_card", day: 28, status: "upcoming" },
  { id: 7, name: "Apple One", amount: 32.95, type: "subscription", day: 30, status: "upcoming" },
  { id: 8, name: "Gym — Equinox", amount: 225, type: "subscription", day: 3, status: "paid" },
  { id: 9, name: "Student Loan", amount: 287, type: "loan", day: 25, status: "upcoming" },
];

const CATEGORIES = [
  { name: "Rent", bucket: "bills", amount: 1850, prev: 1850, sparkline: [1850, 1850, 1850, 1850, 1850, 1850] },
  { name: "Groceries", bucket: "bills", amount: 482, prev: 455, sparkline: [420, 510, 488, 472, 455, 482] },
  { name: "Dining", bucket: "wants", amount: 295, prev: 220, sparkline: [180, 240, 260, 215, 220, 295] },
  { name: "Transit", bucket: "bills", amount: 180, prev: 165, sparkline: [155, 170, 168, 175, 165, 180] },
  { name: "Subscriptions", bucket: "bills", amount: 145, prev: 142, sparkline: [138, 138, 142, 145, 142, 145] },
  { name: "Coffee", bucket: "wants", amount: 98, prev: 76, sparkline: [72, 88, 84, 78, 76, 98] },
  { name: "Savings auto", bucket: "savings", amount: 400, prev: 400, sparkline: [400, 400, 400, 400, 400, 400] },
  { name: "Health", bucket: "bills", amount: 84, prev: 62, sparkline: [60, 72, 68, 65, 62, 84] },
];

const RECENT_EXPENSES = [
  { id: 1, name: "Trader Joe's", category: "Groceries", amount: 62.40, date: "Today" },
  { id: 2, name: "BART", category: "Transit", amount: 5.65, date: "Today" },
  { id: 3, name: "Sightglass", category: "Coffee", amount: 6.50, date: "Yesterday" },
  { id: 4, name: "Marlowe", category: "Dining", amount: 84.10, date: "May 14" },
  { id: 5, name: "Whole Foods", category: "Groceries", amount: 47.92, date: "May 13" },
  { id: 6, name: "Uber", category: "Transit", amount: 18.40, date: "May 12" },
];

// ─── Formatters ───────────────────────────────────────────────────────────
const fmt = (n: number) => "$" + Math.round(n).toLocaleString("en-US");
const fmtDec = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtCompact = (n: number) => n >= 1000 ? "$" + (n / 1000).toFixed(n >= 10_000 ? 0 : 1) + "k" : "$" + Math.round(n);

// ─── Icon maps ────────────────────────────────────────────────────────────
const BILL_ICON = {
  utility: Wifi, subscription: Film, credit_card: CreditCard, loan: Landmark, other: Receipt,
} as const;
const CATEGORY_ICON: Record<string, any> = {
  Rent: IconHome, Groceries: ShoppingBag, Dining: UtensilsCrossed, Transit: Car,
  Subscriptions: Film, Coffee: Coffee, "Savings auto": Landmark, Health: Heart,
};

// ─── Theme (gradient only) ────────────────────────────────────────────────
function makeTheme() {
  return {
    bgDeep: "#0a0613",
    bg: "#0d0918",
    card: "#181028",
    cardSoft: "rgba(255,255,255,0.025)",
    cardEdge: "rgba(167,139,250,0.10)",
    border: "rgba(167,139,250,0.13)",
    fg: "#ede9f6",
    muted: "#8a7da8",
    mutedDim: "#5e5279",
    green: "#34d399",
    red: "#f87171",
    amber: "#fbbf24",
    accent: "#f59e0b",
    accent2: "#ec4899",
    gradient: "linear-gradient(90deg, #f59e0b 0%, #ec4899 100%)",
    bucketColors: { savings: "#f59e0b", bills: "#ec4899", wants: "#a78bfa" },
    heroGlow:
      "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(245,158,11,0.08), transparent 70%), radial-gradient(ellipse 60% 40% at 50% 100%, rgba(236,72,153,0.10), transparent 70%)",
  };
}
type Theme = ReturnType<typeof makeTheme>;

// ─── Reusable atoms ───────────────────────────────────────────────────────
function GradientText({ t, children, style = {} }: { t: Theme; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <span style={{
      background: t.gradient, WebkitBackgroundClip: "text", backgroundClip: "text",
      WebkitTextFillColor: "transparent", color: "transparent", fontVariantNumeric: "tabular-nums", ...style,
    }}>{children}</span>
  );
}

function Pill({ t, tone, children }: { t: Theme; tone: "good" | "bad" | "warn" | "neutral"; children: React.ReactNode }) {
  const tones = {
    good: { bg: "rgba(52,211,153,0.12)", color: t.green, bd: "rgba(52,211,153,0.30)" },
    bad: { bg: "rgba(248,113,113,0.12)", color: t.red, bd: "rgba(248,113,113,0.30)" },
    warn: { bg: "rgba(245,158,11,0.13)", color: t.amber, bd: "rgba(245,158,11,0.30)" },
    neutral: { bg: "rgba(167,139,250,0.10)", color: "#c4b5fd", bd: "rgba(167,139,250,0.22)" },
  };
  const c = tones[tone];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px",
      borderRadius: 999, fontSize: 10.5, fontWeight: 600, letterSpacing: 0.2,
      background: c.bg, color: c.color, border: `1px solid ${c.bd}`, fontFamily: "var(--font-geist-mono, monospace)",
    }}>{children}</span>
  );
}

function ContextStrip({ t, onNav }: { t: Theme; onNav: (k: TabKey) => void }) {
  const projOver = PROJECTED_TOTAL > BUDGET.total;
  const dueSoonCount = BILLS.filter((b) => b.status === "overdue" || b.status === "due-soon").length;
  const items: { label: string; value: string; sub: string; tab: TabKey; tone?: "good" | "bad" | "warn" }[] = [
    { label: "Spent", value: fmt(BUDGET.spent), sub: "this month", tab: "trends" },
    { label: "Projected", value: fmt(PROJECTED_TOTAL), sub: projOver ? "over budget" : "on track", tab: "trends", tone: projOver ? "bad" : "good" },
    { label: "Income", value: fmt(BUDGET.total), sub: "budget", tab: "income" },
    { label: "Bills due", value: String(dueSoonCount), sub: "this week", tab: "bills", tone: "warn" },
  ];
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
      borderRadius: 14, padding: "11px 4px",
      background: t.card, border: `1px solid ${t.border}`,
    }}>
      {items.map((it, i) => (
        <button key={i} onClick={() => onNav(it.tab)} style={{
          background: "transparent", border: "none", padding: "2px 6px", textAlign: "left",
          cursor: "pointer", color: t.fg,
          borderRight: i < 3 ? `1px solid ${t.border}` : "none",
          display: "flex", flexDirection: "column", gap: 2,
        }}>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", color: t.mutedDim }}>{it.label}</span>
          <span style={{
            fontFamily: "var(--font-geist-mono, monospace)", fontSize: 14, fontWeight: 600, lineHeight: 1,
            color: it.tone === "bad" ? t.red : it.tone === "good" ? t.green : it.tone === "warn" ? t.amber : t.fg,
            fontVariantNumeric: "tabular-nums",
          }}>{it.value}</span>
          <span style={{ fontSize: 9, color: t.mutedDim, lineHeight: 1.1 }}>{it.sub}</span>
        </button>
      ))}
    </div>
  );
}

function Header({ t, title, sub, kicker }: { t: Theme; title: string; sub?: string; kicker?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "4px 4px 0", gap: 12 }}>
      <div>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: t.mutedDim, marginBottom: 4 }}>
          {kicker ?? "easyBudget"}
        </div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: t.fg, letterSpacing: -0.4, lineHeight: 1 }}>{title}</h1>
        {sub && <div style={{ fontSize: 11, color: t.muted, marginTop: 3 }}>{sub}</div>}
      </div>
      <div style={{
        display: "flex", alignItems: "center", gap: 4,
        background: t.cardSoft, border: `1px solid ${t.border}`, borderRadius: 999, padding: "5px 10px",
      }}>
        <ChevronLeft size={13} color={t.muted} />
        <span style={{ fontSize: 11, fontWeight: 600, color: t.fg, fontFamily: "var(--font-geist-mono, monospace)" }}>{MONTH_LABEL}</span>
        <ChevronRight size={13} color={t.muted} />
      </div>
    </div>
  );
}

function Sparkline({ data, w = 60, h = 18, color, fill = false }: { data: number[]; w?: number; h?: number; color: string; fill?: boolean }) {
  if (!data?.length) return null;
  const mn = Math.min(...data), mx = Math.max(...data);
  const range = mx - mn || 1;
  const step = w / (data.length - 1);
  const pts = data.map((v, i) => [i * step, h - ((v - mn) / range) * h] as const);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: "visible" }}>
      {fill && <path d={`${d} L${w},${h} L0,${h} Z`} fill={color} opacity={0.18} />}
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Overview ─────────────────────────────────────────────────────────────
function Overview({ t, onNav }: { t: Theme; onNav: (k: TabKey) => void }) {
  const pctUsed = (BUDGET.spent / BUDGET.total) * 100;
  const projPct = (PROJECTED_TOTAL / BUDGET.total) * 100;
  const remaining = BUDGET.total - BUDGET.spent;
  const dayPct = (DAY_OF_MONTH / DAYS_IN_MONTH) * 100;
  const onTrack = PROJECTED_TOTAL <= BUDGET.total;
  const max = Math.max(...DAILY_SPEND);
  const avg = DAILY_SPEND.reduce((a, b) => a + b, 0) / DAILY_SPEND.length;
  const upcoming = BILLS.filter((b) => b.status !== "paid").slice(0, 3);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Header t={t} title="Overview" sub={`Day ${DAY_OF_MONTH} of ${DAYS_IN_MONTH} · ${Math.round(dayPct)}% through month`} />
      <ContextStrip t={t} onNav={onNav} />

      {/* Hero */}
      <div style={{
        background: t.card, border: `1px solid ${t.cardEdge}`, borderRadius: 18,
        padding: 16, position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: 0, right: 0, width: 160, height: 160, background: t.heroGlow, pointerEvents: "none" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: t.mutedDim, textTransform: "uppercase" }}>Available to spend</div>
            <div style={{ marginTop: 2 }}>
              <GradientText t={t} style={{ fontSize: 38, fontWeight: 800, letterSpacing: -1, lineHeight: 1 }}>{fmt(remaining)}</GradientText>
            </div>
            <div style={{ fontSize: 11, color: t.muted, marginTop: 4, fontFamily: "var(--font-geist-mono, monospace)" }}>
              of {fmt(BUDGET.total)} budget · {Math.round(pctUsed)}% used
            </div>
          </div>
          <Pill t={t} tone={onTrack ? "good" : "bad"}>
            {onTrack ? <CheckCircle2 size={11} /> : <TrendingUp size={11} />}
            {onTrack ? "On pace" : "Off pace"}
          </Pill>
        </div>
        <div style={{ marginTop: 14 }}>
          <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 999, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${Math.min(projPct, 100)}%`, background: t.gradient, opacity: 0.25, borderRadius: 999 }} />
            <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${Math.min(pctUsed, 100)}%`, background: t.gradient, borderRadius: 999 }} />
            <div style={{ position: "absolute", left: `${dayPct}%`, top: -2, height: 10, width: 1, background: t.fg, opacity: 0.5 }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 9.5, color: t.muted, fontFamily: "var(--font-geist-mono, monospace)" }}>
            <span><span style={{ color: t.fg }}>{fmt(BUDGET.spent)}</span> spent · {fmt(remaining)} left</span>
            <span>proj {fmt(PROJECTED_TOTAL)}</span>
          </div>
        </div>
      </div>

      {/* Allocation grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {[
          { key: "savings", name: "Savings", pct: BUDGET.savingsPct },
          { key: "bills", name: "Bills", pct: BUDGET.billsPct },
          { key: "wants", name: "Wants", pct: BUDGET.wantsPct },
        ].map((b) => {
          const color = (t.bucketColors as any)[b.key];
          const alloc = BUDGET.total * (b.pct / 100);
          const spent = (BUDGET.byBucket as any)[b.key];
          const fillPct = Math.min((spent / alloc) * 100, 100);
          const over = spent > alloc;
          return (
            <div key={b.key} style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 14, padding: 11 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.8, color, textTransform: "uppercase" }}>{b.name}</span>
                <span style={{ fontSize: 9, color: t.mutedDim, fontFamily: "var(--font-geist-mono, monospace)" }}>{b.pct}%</span>
              </div>
              <div style={{ fontSize: 17, fontWeight: 700, color: t.fg, marginTop: 4, fontFamily: "var(--font-geist-mono, monospace)", letterSpacing: -0.3, fontVariantNumeric: "tabular-nums" }}>{fmtCompact(spent)}</div>
              <div style={{ fontSize: 9.5, color: t.muted, marginTop: 1, fontFamily: "var(--font-geist-mono, monospace)" }}>/ {fmtCompact(alloc)}</div>
              <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 999, marginTop: 8, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${fillPct}%`, background: over ? t.red : color, borderRadius: 999 }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Daily Pace */}
      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 14, padding: "14px 14px 12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.8, color: t.mutedDim, textTransform: "uppercase" }}>Daily pace</div>
            <div style={{ fontFamily: "var(--font-geist-mono, monospace)", fontSize: 26, fontWeight: 600, color: t.fg, marginTop: 4, letterSpacing: -0.5, fontVariantNumeric: "tabular-nums", lineHeight: 1, whiteSpace: "nowrap" }}>
              {fmt(Math.round(BUDGET.spent / DAY_OF_MONTH))}
              <span style={{ fontSize: 11, color: t.muted, fontWeight: 400, marginLeft: 4 }}>/ day average</span>
            </div>
          </div>
          <button onClick={() => onNav("trends")} style={{ background: "transparent", border: "none", color: t.muted, fontSize: 10.5, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 2 }}>
            Trends <ArrowUpRight size={11} />
          </button>
        </div>
        {/* Daily bars */}
        <div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 48, position: "relative" }}>
            <div style={{ position: "absolute", left: 0, right: 0, bottom: (avg / max) * 48, height: 1, borderTop: `1px dashed ${t.border}` }} />
            {Array.from({ length: DAYS_IN_MONTH }).map((_, i) => {
              const v = DAILY_SPEND[i];
              const future = i >= DAY_OF_MONTH;
              return (
                <div key={i} style={{
                  flex: 1,
                  height: future ? 4 : Math.max(2, ((v || 0) / max) * 48),
                  background: future ? "rgba(255,255,255,0.04)" : v && v > avg ? t.gradient : t.accent,
                  opacity: future ? 1 : v ? 1 : 0.3,
                  borderRadius: 1.5,
                }} />
              );
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 9, color: t.mutedDim, fontFamily: "var(--font-geist-mono, monospace)" }}>
            <span>May 1</span><span>day {DAY_OF_MONTH}</span><span>May {DAYS_IN_MONTH}</span>
          </div>
        </div>
      </div>

      {/* Upcoming bills strip */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 4px" }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: t.mutedDim, textTransform: "uppercase" }}>Upcoming bills</span>
          <button onClick={() => onNav("bills")} style={{ background: "transparent", border: "none", color: t.muted, fontSize: 10.5, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 2 }}>
            All bills <ArrowUpRight size={11} />
          </button>
        </div>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
          {upcoming.map((b) => {
            const IconCmp = BILL_ICON[b.type];
            return (
              <div key={b.id} style={{
                minWidth: 132, padding: 11,
                background: b.status === "overdue" ? "rgba(248,113,113,0.06)" : t.card,
                border: `1px solid ${b.status === "overdue" ? "rgba(248,113,113,0.25)" : t.border}`,
                borderRadius: 12,
              }}>
                <IconCmp size={15} color={b.status === "overdue" ? t.red : t.muted} />
                <div style={{ fontSize: 11, color: t.fg, marginTop: 6, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.name.split("—")[0].trim()}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: t.fg, marginTop: 2, fontFamily: "var(--font-geist-mono, monospace)", fontVariantNumeric: "tabular-nums" }}>{fmtDec(b.amount)}</div>
                <div style={{ fontSize: 9.5, color: b.status === "overdue" ? t.red : t.mutedDim, marginTop: 3, fontFamily: "var(--font-geist-mono, monospace)" }}>
                  {b.status === "overdue" ? `${DAY_OF_MONTH - b.day}d late` : `in ${b.day - DAY_OF_MONTH}d`}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent expenses */}
      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 14, padding: "4px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px 6px" }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: t.mutedDim, textTransform: "uppercase" }}>Recent</span>
          <span style={{ fontSize: 10.5, color: t.muted }}>{RECENT_EXPENSES.length} this week</span>
        </div>
        {RECENT_EXPENSES.map((e, i) => {
          const IconCmp = CATEGORY_ICON[e.category] ?? Receipt;
          return (
            <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 11, padding: "8px 14px", borderTop: i ? `1px solid ${t.border}` : "none" }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: "rgba(167,139,250,0.10)", display: "flex", alignItems: "center", justifyContent: "center", color: "#c4b5fd" }}>
                <IconCmp size={14} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, color: t.fg, fontWeight: 500 }}>{e.name}</div>
                <div style={{ fontSize: 10, color: t.muted, marginTop: 1 }}>{e.category} · {e.date}</div>
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: t.fg, fontFamily: "var(--font-geist-mono, monospace)", fontVariantNumeric: "tabular-nums" }}>−{fmtDec(e.amount)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Income ───────────────────────────────────────────────────────────────
function Income({ t, onNav }: { t: Theme; onNav: (k: TabKey) => void }) {
  const totals = INCOME_ENTRIES.reduce((acc, e) => {
    if (e.status === "arrived") acc.arrived += e.amount;
    else acc.expected += e.amount;
    return acc;
  }, { arrived: 0, expected: 0 });
  const pctArrived = (totals.arrived / (totals.arrived + totals.expected)) * 100;
  const obligated = BILLS.filter((b) => b.status !== "paid").reduce((s, b) => s + b.amount, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Header t={t} title="Income" sub="Earnings this month" />
      <ContextStrip t={t} onNav={onNav} />

      {/* Hero */}
      <div style={{ background: t.card, border: `1px solid ${t.cardEdge}`, borderRadius: 18, padding: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: t.mutedDim, textTransform: "uppercase" }}>Budget total</div>
        <div style={{ marginTop: 4 }}>
          <GradientText t={t} style={{ fontSize: 38, fontWeight: 800, letterSpacing: -1, lineHeight: 1 }}>{fmt(BUDGET.total)}</GradientText>
        </div>
        <div style={{ marginTop: 14, height: 8, borderRadius: 999, background: "rgba(255,255,255,0.06)", overflow: "hidden", display: "flex" }}>
          <div style={{ width: `${pctArrived}%`, background: t.accent }} />
          <div style={{ flex: 1, background: `repeating-linear-gradient(45deg, ${t.accent}59 0 6px, transparent 6px 12px)` }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 10, fontFamily: "var(--font-geist-mono, monospace)" }}>
          <span style={{ color: t.fg }}><span style={{ color: t.accent }}>●</span> Arrived {fmt(totals.arrived)}</span>
          <span style={{ color: t.muted }}><span style={{ color: t.accent, opacity: 0.5 }}>▣</span> Expected +{fmt(totals.expected)}</span>
        </div>
      </div>

      {/* Entries */}
      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "10px 14px 8px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${t.border}`, background: t.cardSoft }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: t.mutedDim, textTransform: "uppercase" }}>Entries</span>
          <span style={{ fontSize: 9.5, fontFamily: "var(--font-geist-mono, monospace)", color: t.mutedDim, letterSpacing: 0.5 }}>STATUS · AMOUNT</span>
        </div>
        {INCOME_ENTRIES.map((e, i) => (
          <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 14px", borderTop: i ? `1px solid ${t.border}` : "none" }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10,
              background: e.status === "arrived" ? "rgba(52,211,153,0.10)" : "rgba(245,158,11,0.08)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: e.status === "arrived" ? t.green : t.amber,
            }}>
              {e.status === "arrived" ? <CheckCircle2 size={15} /> : <Calendar size={15} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, color: t.fg, fontWeight: 500 }}>{e.source}</div>
              <div style={{ fontSize: 10, color: t.muted, marginTop: 1, fontFamily: "var(--font-geist-mono, monospace)" }}>{e.date}</div>
            </div>
            <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", fontFamily: "var(--font-geist-mono, monospace)", color: e.status === "arrived" ? t.green : t.amber }}>{e.status}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: e.status === "arrived" ? t.green : t.amber, fontFamily: "var(--font-geist-mono, monospace)", fontVariantNumeric: "tabular-nums" }}>+{fmt(e.amount)}</span>
            </div>
          </div>
        ))}
        <button style={{
          width: "100%", background: "transparent", cursor: "pointer", border: "none",
          borderTop: `1px dashed ${t.border}`, padding: "12px 14px",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          color: t.muted, fontSize: 12, fontWeight: 500,
        }}>
          <Plus size={13} /> Add income entry
        </button>
      </div>

      {/* Flow narrative */}
      <div style={{ background: "rgba(167,139,250,0.05)", border: `1px solid ${t.border}`, borderRadius: 14, padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: t.mutedDim, textTransform: "uppercase" }}>Goes to →</span>
          <button onClick={() => onNav("bills")} style={{ background: "transparent", border: "none", color: t.muted, fontSize: 10.5, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 2 }}>
            Bills <ArrowUpRight size={11} />
          </button>
        </div>
        <div style={{ fontSize: 12.5, color: t.fg, lineHeight: 1.5 }}>
          After bills{" "}<span style={{ fontFamily: "var(--font-geist-mono, monospace)", color: t.accent2 }}>{fmt(obligated)}</span>{" "}
          you&apos;ll have{" "}<GradientText t={t} style={{ fontFamily: "var(--font-geist-mono, monospace)", fontWeight: 600 }}>{fmt(BUDGET.total - obligated)}</GradientText>{" "}
          left for savings + wants.
        </div>
      </div>
    </div>
  );
}

// ─── Bills ────────────────────────────────────────────────────────────────
function Bills({ t, onNav }: { t: Theme; onNav: (k: TabKey) => void }) {
  const overdue = BILLS.filter((b) => b.status === "overdue");
  const dueSoon = BILLS.filter((b) => b.status === "due-soon");
  const upcoming = BILLS.filter((b) => b.status === "upcoming");
  const paid = BILLS.filter((b) => b.status === "paid");
  const totalDue = [...overdue, ...dueSoon, ...upcoming].reduce((s, b) => s + b.amount, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Header t={t} title="Bills" sub="Recurring and one-time" />
      <ContextStrip t={t} onNav={onNav} />

      {/* Hero */}
      <div style={{ background: t.card, border: `1px solid ${t.cardEdge}`, borderRadius: 18, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: t.mutedDim, textTransform: "uppercase" }}>Outstanding</div>
            <div style={{ marginTop: 2 }}>
              <GradientText t={t} style={{ fontSize: 34, fontWeight: 800, letterSpacing: -1, lineHeight: 1 }}>{fmt(totalDue)}</GradientText>
            </div>
            <div style={{ fontSize: 11, color: t.muted, marginTop: 4, fontFamily: "var(--font-geist-mono, monospace)" }}>across {overdue.length + dueSoon.length + upcoming.length} bills</div>
          </div>
          {overdue.length > 0 && <Pill t={t} tone="bad"><AlertCircle size={11} /> {overdue.length} overdue</Pill>}
        </div>

        {/* Calendar timeline */}
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.8, color: t.mutedDim, textTransform: "uppercase", marginBottom: 6 }}>Due dates this month</div>
          <div style={{ position: "relative", height: 28, background: "rgba(255,255,255,0.04)", borderRadius: 6 }}>
            <div style={{ position: "absolute", left: `${(DAY_OF_MONTH / DAYS_IN_MONTH) * 100}%`, top: -3, bottom: -3, width: 1, background: t.fg, opacity: 0.5 }} />
            <div style={{ position: "absolute", left: `${(DAY_OF_MONTH / DAYS_IN_MONTH) * 100}%`, top: -14, transform: "translateX(-50%)", fontSize: 8, color: t.muted, fontFamily: "var(--font-geist-mono, monospace)", letterSpacing: 0.5 }}>today</div>
            {BILLS.map((b) => {
              const left = (b.day / DAYS_IN_MONTH) * 100;
              const color = b.status === "overdue" ? t.red : b.status === "due-soon" ? t.amber : b.status === "paid" ? t.muted : t.fg;
              return (
                <div key={b.id} title={b.name} style={{ position: "absolute", left: `${left}%`, top: 4, bottom: 4, width: 3, background: color, transform: "translateX(-50%)", opacity: b.status === "paid" ? 0.35 : 1, borderRadius: 1 }} />
              );
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5, fontFamily: "var(--font-geist-mono, monospace)", fontSize: 9, color: t.mutedDim }}>
            <span>May 1</span><span>15</span><span>{DAYS_IN_MONTH}</span>
          </div>
        </div>

        {/* breakdown chips */}
        <div style={{ display: "flex", gap: 6, marginTop: 14, fontSize: 10, fontFamily: "var(--font-geist-mono, monospace)" }}>
          <div style={{ flex: 1, padding: "8px 10px", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 9 }}>
            <div style={{ color: t.red, fontSize: 11, fontWeight: 600 }}>{fmt(overdue.reduce((s, b) => s + b.amount, 0))}</div>
            <div style={{ color: t.mutedDim, marginTop: 1 }}>overdue</div>
          </div>
          <div style={{ flex: 1, padding: "8px 10px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 9 }}>
            <div style={{ color: t.amber, fontSize: 11, fontWeight: 600 }}>{fmt(dueSoon.reduce((s, b) => s + b.amount, 0))}</div>
            <div style={{ color: t.mutedDim, marginTop: 1 }}>this week</div>
          </div>
          <div style={{ flex: 1, padding: "8px 10px", background: "rgba(255,255,255,0.03)", border: `1px solid ${t.border}`, borderRadius: 9 }}>
            <div style={{ color: t.fg, fontSize: 11, fontWeight: 600 }}>{fmt(upcoming.reduce((s, b) => s + b.amount, 0))}</div>
            <div style={{ color: t.mutedDim, marginTop: 1 }}>upcoming</div>
          </div>
        </div>
      </div>

      <BillsGroup t={t} label="Overdue" bills={overdue} tone="bad" emptyHide />
      <BillsGroup t={t} label="This week" bills={dueSoon} tone="warn" />
      <BillsGroup t={t} label="Later" bills={upcoming} tone="neutral" />
      <BillsGroup t={t} label="Paid" bills={paid} tone="good" />
    </div>
  );
}

function BillsGroup({ t, label, bills, tone, emptyHide = false }: { t: Theme; label: string; bills: typeof BILLS; tone: "bad" | "warn" | "good" | "neutral"; emptyHide?: boolean }) {
  if (!bills.length && emptyHide) return null;
  const accentColor = { bad: t.red, warn: t.amber, good: t.green, neutral: t.muted }[tone];
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 4px 6px" }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: accentColor, textTransform: "uppercase" }}>{label}</span>
        <span style={{ fontSize: 10, color: t.mutedDim, fontFamily: "var(--font-geist-mono, monospace)" }}>{bills.length} · {fmt(bills.reduce((s, b) => s + b.amount, 0))}</span>
      </div>
      <div style={{
        background: tone === "bad" ? "rgba(248,113,113,0.04)" : tone === "good" ? "rgba(52,211,153,0.03)" : t.card,
        border: `1px solid ${tone === "bad" ? "rgba(248,113,113,0.20)" : t.border}`,
        borderRadius: 12, padding: "4px 0",
      }}>
        {!bills.length && <div style={{ padding: "14px", textAlign: "center", color: t.mutedDim, fontSize: 11 }}>—</div>}
        {bills.map((b, i) => {
          const IconCmp = BILL_ICON[b.type];
          return (
            <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 12px", borderTop: i ? `1px solid ${t.border}` : "none", opacity: tone === "good" ? 0.65 : 1 }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: `${accentColor}15`, display: "flex", alignItems: "center", justifyContent: "center", color: accentColor }}>
                <IconCmp size={15} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, color: t.fg, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.name}</div>
                <div style={{ fontSize: 10, color: t.muted, marginTop: 1, fontFamily: "var(--font-geist-mono, monospace)" }}>
                  {tone === "good" ? `paid May ${b.day}` : tone === "bad" ? `${DAY_OF_MONTH - b.day}d late` : `due May ${b.day}`}
                </div>
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: t.fg, fontFamily: "var(--font-geist-mono, monospace)", fontVariantNumeric: "tabular-nums", textDecoration: tone === "good" ? "line-through" : "none", opacity: tone === "good" ? 0.6 : 1 }}>{fmtDec(b.amount)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Trends ───────────────────────────────────────────────────────────────
function Trends({ t, onNav }: { t: Theme; onNav: (k: TabKey) => void }) {
  const [chartStyle, setChartStyle] = useState<"area" | "line" | "bar">("area");
  const lastMonth = TREND_6MO[TREND_6MO.length - 2];
  const delta = ((PROJECTED_TOTAL - lastMonth.spent) / lastMonth.spent) * 100;
  const deltaUp = delta > 0;
  const movers = [...CATEGORIES].sort((a, b) => Math.abs((b.amount - b.prev) / (b.prev || 1)) - Math.abs((a.amount - a.prev) / (a.prev || 1))).slice(0, 6);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Header t={t} title="Trends" sub="How this month compares" />
      <ContextStrip t={t} onNav={onNav} />

      {/* Insight */}
      <div style={{
        background: t.card, border: `1px solid ${t.border}`,
        borderLeft: `2px solid ${deltaUp ? t.red : t.green}`,
        borderRadius: 8, padding: "12px 14px",
      }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: deltaUp ? t.red : t.green, marginBottom: 6 }}>Insight</div>
        <div style={{ fontSize: 12.5, color: t.fg, lineHeight: 1.5 }}>
          At today&apos;s pace you&apos;ll{" "}
          <GradientText t={t} style={{ fontWeight: 600 }}>spend {fmt(PROJECTED_TOTAL)} this month</GradientText>{" "}
          — {Math.abs(delta).toFixed(1)}% {deltaUp ? "more" : "less"} than April ({fmt(lastMonth.spent)}). Dining is the biggest mover, up 34% vs last month.
        </div>
      </div>

      {/* Chart */}
      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 14, padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: t.mutedDim, textTransform: "uppercase" }}>Income vs Spend</span>
          <div style={{ display: "flex", gap: 4 }}>
            {["6m", "12m", "YTD"].map((r, i) => (
              <button key={r} style={{
                background: i === 0 ? `${t.accent}26` : "transparent",
                border: `1px solid ${i === 0 ? `${t.accent}4d` : t.border}`,
                color: i === 0 ? t.accent : t.muted,
                fontSize: 10, fontFamily: "var(--font-geist-mono, monospace)", padding: "3px 8px", borderRadius: 6, cursor: "pointer",
              }}>{r}</button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
          {(["area", "line", "bar"] as const).map((s) => {
            const active = chartStyle === s;
            return (
              <button key={s} onClick={() => setChartStyle(s)} style={{
                flex: 1, padding: "6px 8px",
                background: active ? t.cardSoft : "transparent",
                border: `1px solid ${active ? t.cardEdge : t.border}`,
                color: active ? t.fg : t.muted,
                fontSize: 11, fontWeight: 500, cursor: "pointer", borderRadius: 7,
                display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4,
                textTransform: "capitalize",
              }}>
                {s === "area" ? <Activity size={11} /> : s === "line" ? <TrendingUp size={11} /> : <PieChart size={11} />}
                {s}
              </button>
            );
          })}
        </div>
        <TrendChart t={t} style={chartStyle} />
        <div style={{ display: "flex", gap: 12, marginTop: 8, fontSize: 10, color: t.muted, fontFamily: "var(--font-geist-mono, monospace)" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 2, background: t.accent }} /> Income</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 2, background: t.accent2 }} /> Spend</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, marginLeft: "auto" }}><span style={{ width: 10, height: 0, borderTop: `1px dashed ${t.muted}` }} /> Projected</span>
        </div>
      </div>

      {/* Movers */}
      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 14, padding: "4px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 14px 6px" }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: t.mutedDim, textTransform: "uppercase" }}>Categories — biggest movers</span>
        </div>
        {movers.map((c, i) => {
          const change = ((c.amount - c.prev) / (c.prev || 1)) * 100;
          const up = change > 0;
          const IconCmp = CATEGORY_ICON[c.name] ?? Receipt;
          return (
            <div key={c.name} style={{ display: "grid", gridTemplateColumns: "24px 1fr 60px 64px 40px", alignItems: "center", gap: 10, padding: "8px 14px", borderTop: i ? `1px solid ${t.border}` : "none" }}>
              <IconCmp size={14} color={t.muted} />
              <span style={{ fontSize: 12, color: t.fg, fontWeight: 500 }}>{c.name}</span>
              <Sparkline data={c.sparkline} color={up ? t.accent2 : t.green} fill />
              <span style={{ fontSize: 12, fontWeight: 600, color: t.fg, textAlign: "right", fontFamily: "var(--font-geist-mono, monospace)", fontVariantNumeric: "tabular-nums" }}>{fmtCompact(c.amount)}</span>
              <span style={{ fontSize: 9.5, fontWeight: 600, color: change === 0 ? t.mutedDim : up ? t.red : t.green, fontFamily: "var(--font-geist-mono, monospace)", textAlign: "right" }}>
                {change === 0 ? "—" : (up ? "▲" : "▼") + " " + Math.abs(change).toFixed(0) + "%"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TrendChart({ t, style }: { t: Theme; style: "area" | "line" | "bar" }) {
  const w = 320, h = 130;
  const padL = 28, padR = 8, padT = 8, padB = 22;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;
  const data = TREND_6MO;
  const max = Math.max(...data.map((d) => Math.max(d.income, d.spent))) * 1.05;
  const stepW = plotW / (data.length - 1);
  const x = (i: number) => padL + i * stepW;
  const y = (v: number) => padT + plotH - (v / max) * plotH;
  const projIdx = data.length - 1;
  const projY = y(PROJECTED_TOTAL);
  const incomeD = data.map((d, i) => `${i ? "L" : "M"}${x(i)},${y(d.income)}`).join(" ");
  const spendD = data.map((d, i) => `${i ? "L" : "M"}${x(i)},${y(d.spent)}`).join(" ");
  const spendArea = spendD + ` L${x(data.length - 1)},${padT + plotH} L${x(0)},${padT + plotH} Z`;
  const incomeArea = incomeD + ` L${x(data.length - 1)},${padT + plotH} L${x(0)},${padT + plotH} Z`;
  const gradIdA = `pa-income-${t.accent.replace("#", "")}`;
  const gradIdB = `pa-spend-${t.accent2.replace("#", "")}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: "block" }}>
      <defs>
        <linearGradient id={gradIdA} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={t.accent} stopOpacity="0.30" />
          <stop offset="100%" stopColor={t.accent} stopOpacity="0" />
        </linearGradient>
        <linearGradient id={gradIdB} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={t.accent2} stopOpacity="0.35" />
          <stop offset="100%" stopColor={t.accent2} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((f, i) => (
        <line key={i} x1={padL} x2={padL + plotW} y1={padT + plotH * f} y2={padT + plotH * f} stroke={t.border} strokeWidth="1" />
      ))}
      {style === "bar" ? (
        data.map((d, i) => {
          const bw = stepW * 0.32;
          return (
            <g key={i}>
              <rect x={x(i) - bw - 2} y={y(d.income)} width={bw} height={plotH - (y(d.income) - padT)} fill={t.accent} opacity={0.85} rx={1} />
              <rect x={x(i) + 2} y={y(d.spent)} width={bw} height={plotH - (y(d.spent) - padT)} fill={t.accent2} opacity={(d as any).partial ? 0.45 : 0.85} rx={1} />
            </g>
          );
        })
      ) : style === "line" ? (
        <>
          <path d={incomeD} fill="none" stroke={t.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d={spendD} fill="none" stroke={t.accent2} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : (
        <>
          <path d={incomeArea} fill={`url(#${gradIdA})`} />
          <path d={spendArea} fill={`url(#${gradIdB})`} />
          <path d={incomeD} fill="none" stroke={t.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d={spendD} fill="none" stroke={t.accent2} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      <line x1={x(projIdx)} y1={y(data[projIdx].spent)} x2={x(projIdx) + 2} y2={projY} stroke={t.accent2} strokeWidth="1.5" strokeDasharray="2 2" />
      <circle cx={x(projIdx) + 2} cy={projY} r="3" fill="none" stroke={t.accent2} strokeWidth="1.5" />
      {data.map((d, i) => (
        <text key={i} x={x(i)} y={h - 6} textAnchor="middle" fontSize="9" fill={t.mutedDim} fontFamily="var(--font-geist-mono, monospace)">{d.label}</text>
      ))}
      <text x={padL - 4} y={y(0) + 3} textAnchor="end" fontSize="8" fill={t.mutedDim} fontFamily="var(--font-geist-mono, monospace)">0</text>
      <text x={padL - 4} y={y(max / 2) + 3} textAnchor="end" fontSize="8" fill={t.mutedDim} fontFamily="var(--font-geist-mono, monospace)">{fmtCompact(max / 2)}</text>
      <text x={padL - 4} y={y(max) + 3} textAnchor="end" fontSize="8" fill={t.mutedDim} fontFamily="var(--font-geist-mono, monospace)">{fmtCompact(max)}</text>
    </svg>
  );
}

// ─── Add Expense drawer ───────────────────────────────────────────────────
function AddExpense({ t, onClose }: { t: Theme; onClose: () => void }) {
  const [amount] = useState("42.50");
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 20, background: "rgba(0,0,0,0.65)", display: "flex", flexDirection: "column", justifyContent: "flex-end" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: t.card, borderTopLeftRadius: 22, borderTopRightRadius: 22, border: `1px solid ${t.cardEdge}`, padding: 18, paddingBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
          <div style={{ width: 36, height: 4, background: "rgba(255,255,255,0.2)", borderRadius: 999 }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: t.fg }}>Add expense</span>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: t.muted, cursor: "pointer" }}><X size={18} /></button>
        </div>
        <div style={{ textAlign: "center", padding: "18px 0" }}>
          <GradientText t={t} style={{ fontSize: 48, fontWeight: 800, letterSpacing: -1.5 }}>${amount}</GradientText>
        </div>
        <input placeholder="What was this for?" defaultValue="Marlowe — dinner" style={{ width: "100%", background: t.bgDeep, border: `1px solid ${t.border}`, borderRadius: 11, padding: "12px 14px", color: t.fg, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
        <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
          {[
            { key: "savings", label: "Savings", icon: Landmark, active: false },
            { key: "bills", label: "Bills", icon: Receipt, active: false },
            { key: "wants", label: "Wants", icon: Heart, active: true },
          ].map((b) => (
            <button key={b.key} style={{ flex: 1, padding: "11px 8px", borderRadius: 11, background: b.active ? "rgba(167,139,250,0.15)" : t.bgDeep, border: `1px solid ${b.active ? "rgba(167,139,250,0.40)" : t.border}`, color: b.active ? "#c4b5fd" : t.muted, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600 }}>
              <b.icon size={16} />
              {b.label}
            </button>
          ))}
        </div>
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: t.mutedDim, textTransform: "uppercase", marginBottom: 6 }}>Paid with</div>
          <div style={{ display: "flex", gap: 6 }}>
            {["Cash", "Debit", "Chase CC", "+ New"].map((m, i) => (
              <button key={m} style={{ padding: "8px 12px", borderRadius: 9, background: i === 2 ? `${t.accent}22` : t.bgDeep, border: `1px solid ${i === 2 ? `${t.accent}59` : t.border}`, color: i === 2 ? t.accent : t.muted, cursor: "pointer", fontSize: 11, fontWeight: 500 }}>{m}</button>
            ))}
          </div>
        </div>
        <button style={{ marginTop: 18, width: "100%", padding: "14px", background: t.gradient, border: "none", borderRadius: 13, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Save expense</button>
      </div>
    </div>
  );
}

// ─── Bottom nav + shell ───────────────────────────────────────────────────
type TabKey = "overview" | "income" | "bills" | "trends";
const NAV: { key: TabKey; label: string; icon: any }[] = [
  { key: "overview", label: "Overview", icon: IconHome },
  { key: "income", label: "Income", icon: Wallet },
  { key: "bills", label: "Bills", icon: Receipt },
  { key: "trends", label: "Trends", icon: PieChart },
];

function Nav({ t, tab, setTab, onAdd }: { t: Theme; tab: TabKey; setTab: (k: TabKey) => void; onAdd: () => void }) {
  return (
    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 10, background: "rgba(10,6,19,0.85)", backdropFilter: "blur(20px)", borderTop: `1px solid ${t.border}`, paddingBottom: 26 }}>
      <div style={{ display: "flex", justifyContent: "space-around", padding: "6px 24px 0", fontSize: 7, color: t.mutedDim, letterSpacing: 0.5, fontFamily: "var(--font-geist-mono, monospace)" }}>
        <span /><span>→</span><span>→</span><span>→</span><span />
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-around", padding: "4px 0 8px", position: "relative" }}>
        {NAV.slice(0, 2).map((it) => <NavItem key={it.key} t={t} label={it.label} icon={it.icon} active={tab === it.key} onClick={() => setTab(it.key)} />)}
        <button onClick={onAdd} aria-label="Add expense" style={{ width: 50, height: 50, borderRadius: 999, background: t.gradient, border: "3px solid #0a0613", marginTop: -22, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 24px rgba(245,158,11,0.35)" }}>
          <Plus size={22} strokeWidth={2.5} />
        </button>
        {NAV.slice(2).map((it) => <NavItem key={it.key} t={t} label={it.label} icon={it.icon} active={tab === it.key} onClick={() => setTab(it.key)} />)}
      </div>
    </div>
  );
}

function NavItem({ t, label, icon: Icon, active, onClick }: { t: Theme; label: string; icon: any; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ background: "transparent", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "6px 14px", color: active ? t.accent : t.muted }}>
      <Icon size={20} />
      <span style={{ fontSize: 9.5, fontWeight: active ? 700 : 500, letterSpacing: 0.5 }}>{label}</span>
    </button>
  );
}

// ─── Outer banner ─────────────────────────────────────────────────────────
function PreviewShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <div style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.4)", color: "#fde68a", padding: "8px 12px", fontSize: 12, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <span>🎨 Refined Hybrid mockup — seed data, not connected. <Link href="/" style={{ color: "#fbbf24", textDecoration: "underline" }}>Back to app</Link></span>
      </div>
      <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "stretch" }}>
        {children}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────
export default function HybridPreview() {
  const [tab, setTab] = useState<TabKey>("overview");
  const [adding, setAdding] = useState(false);
  const theme = useMemo(() => makeTheme(), []);

  // Lock scroll on the outer page since we have our own scroller
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <PreviewShell>
      <div style={{
        position: "relative", width: "100%", maxWidth: 420, margin: "0 auto",
        background: theme.bgDeep, color: theme.fg, overflow: "hidden",
        display: "flex", flexDirection: "column",
      }}>
        <div style={{ position: "absolute", inset: 0, background: theme.heroGlow, pointerEvents: "none" }} />
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 14px 110px", position: "relative", zIndex: 1 }}>
          {tab === "overview" && <Overview t={theme} onNav={setTab} />}
          {tab === "income" && <Income t={theme} onNav={setTab} />}
          {tab === "bills" && <Bills t={theme} onNav={setTab} />}
          {tab === "trends" && <Trends t={theme} onNav={setTab} />}
        </div>
        <Nav t={theme} tab={tab} setTab={setTab} onAdd={() => setAdding(true)} />
        {adding && <AddExpense t={theme} onClose={() => setAdding(false)} />}
      </div>
    </PreviewShell>
  );
}
