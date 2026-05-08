import { getOrCreateMonth } from "@/lib/actions/months";
import { getIncomeEntries } from "@/lib/actions/income";
import { currentYearMonth, formatCurrency, calcIncomeTotals } from "@/lib/utils";
import { MonthSwitcher } from "@/components/layout/month-switcher";
import { OverdueBanner } from "@/components/income/overdue-banner";
import { IncomeEntryList } from "@/components/income/income-entry-list";
import { IncomeForm } from "@/components/income/income-form";

export default async function IncomePage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const params = await searchParams;
  const def = currentYearMonth();
  const year  = parseInt(params.year  ?? String(def.year));
  const month = parseInt(params.month ?? String(def.month));

  const monthData = await getOrCreateMonth(year, month);
  const entries = await getIncomeEntries(monthData.id);
  const totals = calcIncomeTotals(entries);

  const today = new Date().toISOString().split("T")[0];
  const overdueEntries = entries.filter(
    (e) => e.status === "expected" && e.expectedDate < today
  );

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-foreground text-xl font-bold">Income</h2>
          <p className="text-muted-base text-sm">Track your earnings this month</p>
        </div>
        <MonthSwitcher year={year} month={month} />
      </div>

      {overdueEntries.map((e) => (
        <OverdueBanner key={e.id} entry={e} />
      ))}

      <IncomeEntryList entries={entries} />

      <div className="rounded-2xl bg-white/[0.03] border border-accent-purple/10 p-4 space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-muted-base text-sm">Budget total <span className="text-[10px]">(arrived + expected)</span></span>
          <span className="text-foreground font-bold text-lg">{formatCurrency(totals.budgetTotal)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-base text-sm">Actual balance <span className="text-[10px]">(arrived only)</span></span>
          <span className="text-accent-purple-light font-semibold">{formatCurrency(totals.actualBalance)}</span>
        </div>
        {totals.possible > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-muted-base text-xs">+ Possible</span>
            <span className="text-muted-base text-xs">+{formatCurrency(totals.possible)}</span>
          </div>
        )}
      </div>

      <IncomeForm monthId={monthData.id} />
    </div>
  );
}
