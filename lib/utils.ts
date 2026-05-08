import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

export function formatMonth(year: number, month: number) {
  return new Date(year, month - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function currentYearMonth() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function calcIncomeTotals(entries: { status: string; amount: number }[]) {
  const arrived  = entries.filter((e) => e.status === "arrived").reduce((s, e) => s + e.amount, 0);
  const expected = entries.filter((e) => e.status === "expected").reduce((s, e) => s + e.amount, 0);
  const possible = entries.filter((e) => e.status === "might_arrive").reduce((s, e) => s + e.amount, 0);
  return { budgetTotal: arrived + expected, actualBalance: arrived, possible };
}
