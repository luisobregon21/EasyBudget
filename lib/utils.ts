import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Round a monetary value to 2 decimal places. Use at read boundaries
 * (server-action return values) so the rest of the app never has to deal
 * with floating-point drift like `39.02 - 39.02 = -1.4e-14`.
 */
export function roundMoney(amount: number) {
  return Math.round(amount * 100) / 100;
}

export function formatCurrency(amount: number, currency = "USD") {
  // Belt-and-suspenders: even if a caller forgot to roundMoney, anything that
  // rounds to $0.00 is forced to 0 so we never display "-$0.00".
  const safe = Math.abs(amount) < 0.005 ? 0 : amount;
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(safe);
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
