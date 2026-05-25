/**
 * Shared date helpers for bills. Pure — no DB or session imports — so both
 * server actions and server components can use them without circular imports.
 */

export type BillForDueDay = {
  dueDay: number;
  frequency: "monthly" | "yearly" | "quarterly" | string;
  renewalDay?: number | null;
  quarterlyDates?: string | null;
};

/**
 * Effective due day for a bill in a given calendar month.
 *
 * - monthly: dueDay
 * - yearly: renewalDay (or dueDay fallback)
 * - quarterly: the day from quarterlyDates matching this month, falling back to dueDay
 *
 * Returns `null` for quarterly bills whose schedule doesn't include `month`.
 */
export function getEffectiveDueDay(bill: BillForDueDay, month: number): number | null {
  if (bill.frequency === "quarterly") {
    if (!bill.quarterlyDates) return bill.dueDay;
    try {
      const dates: { month: number; day: number }[] = JSON.parse(bill.quarterlyDates);
      const thisMonth = dates.find((d) => d.month === month);
      return thisMonth?.day ?? null;
    } catch {
      return bill.dueDay;
    }
  }
  if (bill.frequency === "yearly") return bill.renewalDay ?? bill.dueDay;
  return bill.dueDay;
}
