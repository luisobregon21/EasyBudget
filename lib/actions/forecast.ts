export function dailyPace(spent: number, dayOfMonth: number): number {
  return dayOfMonth > 0 ? spent / dayOfMonth : 0;
}
export function projectedTotal(spent: number, dayOfMonth: number, daysInMonth: number): number {
  return Math.round(dailyPace(spent, dayOfMonth) * daysInMonth);
}
export function paceStatus(projected: number, budget: number): "good" | "bad" {
  if (budget <= 0) return "good";
  return projected <= budget ? "good" : "bad";
}
export function daysIntoMonth(date: Date): { day: number; total: number; pctThroughMonth: number } {
  const day = date.getDate();
  const total = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  return { day, total, pctThroughMonth: Math.round((day / total) * 100) };
}
