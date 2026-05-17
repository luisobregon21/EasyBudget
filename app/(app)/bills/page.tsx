import { getUserBills, getUpcomingBills, getBillPaymentsForMonth } from "@/lib/actions/bills";
import { getOrCreateMonth, getMonth } from "@/lib/actions/months";
import { getIncomeEntries, cleanupBackfilledPastEntries } from "@/lib/actions/income";
import { getExpensesForMonth } from "@/lib/actions/expenses";
import { currentYearMonth, calcIncomeTotals } from "@/lib/utils";
import { daysIntoMonth, projectedTotal } from "@/lib/actions/forecast";
import { ContextStrip } from "@/components/layout/context-strip";
import { TopTabs } from "@/components/layout/top-tabs";
import { MonthSwitcher } from "@/components/layout/month-switcher";
import { BillsHero } from "@/components/bills/bills-hero";
import { BillsGroup } from "@/components/bills/bills-group";
import { BillsCalendar } from "@/components/bills/bills-calendar";
import { PaidBillsList } from "@/components/bills/paid-bills-list";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

type BillStatus = "overdue" | "due-soon" | "upcoming" | "paid";

type UserBill = {
  id: number;
  name: string;
  amount: number;
  dueDay: number;
  frequency: string;
  renewalMonth?: number | null;
  renewalDay?: number | null;
  quarterlyDates?: string | null;
  description?: string | null;
  type: string;
  creditCardId?: number | null;
  creditCardName?: string | null;
  active: boolean;
};

function getBillStatus(b: UserBill): BillStatus {
  const today      = new Date();
  const todayDay   = today.getDate();
  const todayMonth = today.getMonth() + 1;

  if (b.frequency === "quarterly") {
    if (!b.quarterlyDates) return "upcoming";
    const dates: { month: number; day: number }[] = JSON.parse(b.quarterlyDates);
    const thisMonth = dates.find((d) => d.month === todayMonth);
    if (!thisMonth) return "upcoming";
    const diff = thisMonth.day - todayDay;
    if (diff < 0)  return "overdue";
    if (diff <= 7) return "due-soon";
    return "upcoming";
  }
  if (b.frequency === "yearly") {
    if (b.renewalMonth !== todayMonth) return "upcoming";
    const day = b.renewalDay ?? 1;
    if (day < todayDay)        return "overdue";
    if (day - todayDay <= 7)   return "due-soon";
    return "upcoming";
  }
  const diff = b.dueDay - todayDay;
  if (diff < 0)  return "overdue";
  if (diff <= 7) return "due-soon";
  return "upcoming";
}

function getDueDay(b: UserBill, todayMonth: number): number {
  if (b.frequency === "quarterly") {
    if (!b.quarterlyDates) return b.dueDay;
    const dates: { month: number; day: number }[] = JSON.parse(b.quarterlyDates);
    const thisMonth = dates.find((d) => d.month === todayMonth);
    return thisMonth?.day ?? b.dueDay;
  }
  if (b.frequency === "yearly") return b.renewalDay ?? b.dueDay;
  return b.dueDay;
}

const TABS = [
  { id: "all",       label: "All"       },
  { id: "overdue",   label: "Overdue"   },
  { id: "recurring", label: "Recurring" },
  { id: "paid",      label: "Paid"      },
  { id: "calendar",  label: "Calendar"  },
];

function prevMonthCoords(year: number, month: number) {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

export default async function BillsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; sub?: string }>;
}) {
  const params = await searchParams;
  const def   = currentYearMonth();
  const year  = parseInt(params.year  ?? String(def.year));
  const month = parseInt(params.month ?? String(def.month));
  const sub   = params.sub ?? "all";

  const monthData = await getOrCreateMonth(year, month);
  const last      = prevMonthCoords(year, month);
  const lastMonthData = await getMonth(last.year, last.month);

  const [billsList, upcomingBillsWeek, incomeEntries, expenseRows, lastMonthExpenses, paidBillPayments] = await Promise.all([
    getUserBills(),
    getUpcomingBills(7),
    getIncomeEntries(monthData.id),
    getExpensesForMonth(monthData.id),
    lastMonthData ? getExpensesForMonth(lastMonthData.id) : Promise.resolve([]),
    getBillPaymentsForMonth(monthData.id),
  ]);

  const { budgetTotal } = calcIncomeTotals(incomeEntries);
  const income     = budgetTotal > 0 ? budgetTotal : (monthData.income ?? 0);
  const totalSpent = expenseRows.reduce((s, e) => s + (e.amountUsd ?? 0), 0);
  const billsDueCount = upcomingBillsWeek.length;

  const { day: dayOfMonth, total: daysInMonth } = daysIntoMonth(new Date());
  const projected = projectedTotal(totalSpent, dayOfMonth, daysInMonth);

  const todayMonth = new Date().getMonth() + 1;

  // Classify bills
  const withStatus = billsList.map((b) => ({
    ...b,
    computedStatus: getBillStatus(b) as BillStatus,
    effectiveDueDay: getDueDay(b, todayMonth),
  }));

  const overdueBills  = withStatus.filter((b) => b.computedStatus === "overdue");
  const dueSoonBills  = withStatus.filter((b) => b.computedStatus === "due-soon");
  const upcomingBills = withStatus.filter((b) => b.computedStatus === "upcoming");
  // Paid bills: derive from paidBillPayments (set of billIds paid this month)
  const paidBillIds = new Set(paidBillPayments.map((p) => p.billId));
  const paidBills = withStatus.filter((b) => paidBillIds.has(b.id));

  // BillsHero needs BillMarker[]
  const billMarkers = withStatus.map((b) => ({
    day:    b.effectiveDueDay,
    status: b.computedStatus,
  }));

  const overdueTotal  = overdueBills.reduce((s, b)  => s + b.amount, 0);
  const dueSoonTotal  = dueSoonBills.reduce((s, b)  => s + b.amount, 0);
  const upcomingTotal = upcomingBills.reduce((s, b) => s + b.amount, 0);
  const totalDue      = overdueTotal + dueSoonTotal + upcomingTotal;

  // BillsCalendar needs { id, name, type, day, status, amount }[]
  const calendarBills = withStatus.map((b) => ({
    id:     b.id,
    name:   b.name,
    type:   b.type,
    day:    b.effectiveDueDay,
    status: b.computedStatus as BillStatus,
    amount: b.amount,
  }));
  const calendarBillDays = [...new Set(calendarBills.map((b) => b.day))];

  // All bills are recurring (bills schema has monthly | yearly | quarterly only)
  const recurringBills = withStatus;

  // BillsGroup expects: { id, name, amount, dueDay, type, status? }
  const toGroupBills = (arr: typeof withStatus) =>
    arr.map((b) => ({
      id:     b.id,
      name:   b.name,
      amount: b.amount,
      dueDay: b.effectiveDueDay,
      type:   b.type,
      status: b.computedStatus,
    }));

  return (
    <div className="space-y-4">
      {/* header */}
      <div className="flex items-start justify-between gap-2 pb-1">
        <div className="min-w-0">
          <p className="text-[9px] font-bold tracking-[0.15em] uppercase text-muted-base">easyBudget</p>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Bills</h1>
          <p className="text-xs text-muted-base mt-0.5">Recurring payments and reminders</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <MonthSwitcher year={year} month={month} />
          <Link href="/bills/new">
            <Button size="sm" className="bg-gradient-brand text-white font-bold gap-1">
              <Plus size={14} /> Add
            </Button>
          </Link>
        </div>
      </div>

      <ContextStrip
        spent={totalSpent}
        projected={projected}
        income={income}
        billsDueCount={billsDueCount}
      />

      <TopTabs tabs={TABS} />

      <div className="pt-2 space-y-4">
        {sub === "all" && (
          <>
            <BillsHero
              totalDue={totalDue}
              overdueCount={overdueBills.length}
              overdueTotal={overdueTotal}
              dueSoonTotal={dueSoonTotal}
              upcomingTotal={upcomingTotal}
              bills={billMarkers}
              dayOfMonth={dayOfMonth}
              daysInMonth={daysInMonth}
            />
            <BillsGroup label="Overdue"    bills={toGroupBills(overdueBills)}  tone="bad"     emptyHide dayOfMonth={dayOfMonth} monthId={monthData.id} />
            <BillsGroup label="This Week"  bills={toGroupBills(dueSoonBills)}  tone="warn"    emptyHide dayOfMonth={dayOfMonth} monthId={monthData.id} />
            <BillsGroup label="Upcoming"   bills={toGroupBills(upcomingBills)} tone="neutral" emptyHide dayOfMonth={dayOfMonth} monthId={monthData.id} />
            {paidBillPayments.length > 0 && (
              <>
                <div style={{ padding: "0 4px 6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "#34d399", textTransform: "uppercase" }}>Paid</span>
                  <span style={{ fontSize: 10, color: "#5e5279", fontFamily: "var(--font-geist-mono, monospace)" }}>{paidBillPayments.length} paid</span>
                </div>
                <PaidBillsList payments={paidBillPayments} />
              </>
            )}
            {billsList.length === 0 && (
              <p className="text-muted-base text-sm text-center py-8">No bills yet. Add your first one.</p>
            )}
          </>
        )}

        {sub === "overdue" && (
          <>
            <BillsHero
              totalDue={overdueTotal}
              overdueCount={overdueBills.length}
              overdueTotal={overdueTotal}
              dueSoonTotal={0}
              upcomingTotal={0}
              bills={billMarkers.filter((b) => b.status === "overdue")}
              dayOfMonth={dayOfMonth}
              daysInMonth={daysInMonth}
            />
            <BillsGroup label="Overdue" bills={toGroupBills(overdueBills)} tone="bad" dayOfMonth={dayOfMonth} monthId={monthData.id} />
          </>
        )}

        {sub === "recurring" && (
          <BillsGroup
            label="Recurring"
            bills={toGroupBills(recurringBills)}
            tone="neutral"
            dayOfMonth={dayOfMonth}
            monthId={monthData.id}
          />
        )}

        {sub === "paid" && (
          <>
            <div style={{ padding: "0 4px 6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "#34d399", textTransform: "uppercase" }}>Paid</span>
              <span style={{ fontSize: 10, color: "#5e5279", fontFamily: "var(--font-geist-mono, monospace)" }}>{paidBillPayments.length} paid</span>
            </div>
            <PaidBillsList payments={paidBillPayments} />
          </>
        )}

        {sub === "calendar" && (
          <BillsCalendar
            year={year}
            month={month}
            billDays={calendarBillDays}
            bills={calendarBills}
          />
        )}
      </div>
    </div>
  );
}
