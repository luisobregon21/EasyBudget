import { getOrCreateMonth } from "@/lib/actions/months";
import { getIncomeEntries, calcIncomeTotals } from "@/lib/actions/income";
import { getSavingsAllocations } from "@/lib/actions/goals";
import { currentYearMonth, formatCurrency } from "@/lib/utils";
import { MonthSwitcher } from "@/components/layout/month-switcher";
import { SavingsAllocationList } from "@/components/goals/savings-allocation-list";

export default async function GoalsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const params = await searchParams;
  const def = currentYearMonth();
  const year  = parseInt(params.year  ?? String(def.year));
  const month = parseInt(params.month ?? String(def.month));

  const [monthData, allocations] = await Promise.all([
    getOrCreateMonth(year, month),
    getSavingsAllocations(),
  ]);

  const entries = await getIncomeEntries(monthData.id);
  const { budgetTotal } = calcIncomeTotals(entries);
  const incomeBasis = budgetTotal > 0 ? budgetTotal : (monthData.income ?? 0);

  const savingsPot  = incomeBasis * ((monthData.savingsPct ?? 20) / 100);
  const billsPot    = incomeBasis * ((monthData.billsPct   ?? 70) / 100);
  const personalPot = incomeBasis * ((monthData.wantsPct   ?? 10) / 100);

  const POTS = [
    { label: "Savings",  amount: savingsPot,  pct: monthData.savingsPct ?? 20, color: "text-amber-400",  bg: "bg-amber-500/10",  border: "border-amber-500/25" },
    { label: "Bills",    amount: billsPot,    pct: monthData.billsPct   ?? 70, color: "text-pink-400",   bg: "bg-pink-500/10",   border: "border-pink-500/25" },
    { label: "Personal", amount: personalPot, pct: monthData.wantsPct   ?? 10, color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/25" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-foreground text-xl font-bold">Goals & Allocation</h2>
          <p className="text-muted-base text-sm">Where your money goes</p>
        </div>
        <MonthSwitcher year={year} month={month} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        {POTS.map((p) => (
          <div key={p.label} className={`rounded-2xl ${p.bg} border ${p.border} p-4 text-center`}>
            <p className={`text-[10px] uppercase tracking-wider ${p.color} mb-1`}>{p.label}</p>
            <p className={`text-xl font-bold ${p.color}`}>{formatCurrency(p.amount)}</p>
            <p className="text-muted-base text-[10px] mt-0.5">{p.pct}% of income</p>
          </div>
        ))}
      </div>

      <SavingsAllocationList allocations={allocations} savingsPot={savingsPot} />
    </div>
  );
}
