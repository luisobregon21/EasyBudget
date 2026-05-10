import { getUserBills, deleteBill } from "@/lib/actions/bills";
import { logBillPayment } from "@/lib/actions/expenses";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FireAndForgetButton } from "@/components/ui/fire-and-forget-button";
import Link from "next/link";
import { Trash2, Plus, Pencil } from "lucide-react";

const TYPE_ICON: Record<string, string> = {
  utility: "💡", subscription: "📺", credit_card: "💳", loan: "🏦", other: "📋",
};
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function getBillStatus(b: { frequency: string; dueDay: number; renewalMonth?: number | null; renewalDay?: number | null; quarterlyDates?: string | null }) {
  const today = new Date();
  const todayDay = today.getDate();
  const todayMonth = today.getMonth() + 1;

  if (b.frequency === "quarterly") {
    if (!b.quarterlyDates) return "upcoming";
    const dates: { month: number; day: number }[] = JSON.parse(b.quarterlyDates);
    const thisMonth = dates.find((d) => d.month === todayMonth);
    if (!thisMonth) return "upcoming";
    const diff = thisMonth.day - todayDay;
    if (diff < 0) return "overdue";
    if (diff <= 7) return "due-soon";
    return "upcoming";
  }

  if (b.frequency === "yearly") {
    if (b.renewalMonth !== todayMonth) return "upcoming";
    const day = b.renewalDay ?? 1;
    if (day < todayDay) return "overdue";
    if (day - todayDay <= 7) return "due-soon";
    return "upcoming";
  }

  const diff = b.dueDay - todayDay;
  if (diff < 0) return "overdue";
  if (diff <= 7) return "due-soon";
  return "upcoming";
}

export default async function BillsPage() {
  const billsList = await getUserBills();

  const overdue  = billsList.filter((b) => getBillStatus(b) === "overdue");
  const dueSoon  = billsList.filter((b) => getBillStatus(b) === "due-soon");
  const upcoming = billsList.filter((b) => getBillStatus(b) === "upcoming");

  function BillRow({ b }: { b: typeof billsList[number] }) {
    const status = getBillStatus(b);
    const isCardLinked = !!b.creditCardId;
    const isAutoPayable = isCardLinked && (b.type === "subscription" || b.type === "credit_card");

    let dueLine: string;
    if (b.frequency === "quarterly") {
      const dates: { month: number; day: number }[] = b.quarterlyDates ? JSON.parse(b.quarterlyDates) : [];
      dueLine = "Quarterly · " + dates.map((d) => `${MONTHS_SHORT[d.month - 1]} ${d.day}`).join(", ");
    } else if (b.frequency === "yearly") {
      dueLine = `Renews ${MONTHS_SHORT[(b.renewalMonth ?? 1) - 1]} ${b.renewalDay ?? "?"} · Yearly`;
    } else {
      dueLine = `Due day ${b.dueDay} · Monthly`;
    }

    return (
      <div className="flex items-center justify-between p-4 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xl shrink-0">{TYPE_ICON[b.type] ?? "📋"}</span>
          <div className="min-w-0">
            <p className="text-foreground font-medium truncate">{b.name}</p>
            <p className="text-muted-base text-xs">
              {dueLine}
              {b.creditCardName && (
                <span className="ml-2 bg-accent-purple/15 text-accent-purple-light rounded px-1.5 py-0.5 text-[10px]">
                  💳 {b.creditCardName}
                </span>
              )}
            </p>
            {b.description && (
              <p className="text-muted-base text-[10px] truncate mt-0.5">{b.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-amber-400 font-bold">{formatCurrency(b.amount)}</span>
          {(status === "overdue" || status === "due-soon") && (
            <FireAndForgetButton
              action={logBillPayment.bind(null, b.id)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                isAutoPayable
                  ? "bg-green-500/15 border-green-500/40 text-green-400 hover:bg-green-500/25"
                  : "bg-accent-purple/15 border-accent-purple/30 text-accent-purple-light hover:bg-accent-purple/25"
              }`}
            >
              {isAutoPayable ? "✓ Auto-log" : "Mark paid"}
            </FireAndForgetButton>
          )}
          <Link href={`/bills/${b.id}/edit`} className="text-muted-base hover:text-foreground transition-colors">
            <Pencil size={14} />
          </Link>
          <FireAndForgetButton
            action={deleteBill.bind(null, b.id)}
            className="text-muted-base hover:text-red-400 transition-colors"
          >
            <Trash2 size={15} />
          </FireAndForgetButton>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-foreground text-xl font-bold">Bills & Subscriptions</h2>
          <p className="text-muted-base text-sm">Recurring payments and reminders</p>
        </div>
        <Link href="/bills/new">
          <Button className="bg-gradient-brand text-white font-bold gap-2">
            <Plus size={16} /> Add Bill
          </Button>
        </Link>
      </div>

      {billsList.length === 0 && (
        <p className="text-muted-base text-sm text-center py-8">No bills yet. Add your first one.</p>
      )}

      {overdue.length > 0 && (
        <section className="space-y-2">
          <p className="text-red-400 text-[10px] uppercase tracking-widest font-semibold">Overdue</p>
          <div className="rounded-2xl bg-red-500/[0.06] border border-red-500/20 divide-y divide-white/5">
            {overdue.map((b) => <BillRow key={b.id} b={b} />)}
          </div>
        </section>
      )}

      {dueSoon.length > 0 && (
        <section className="space-y-2">
          <p className="text-amber-400 text-[10px] uppercase tracking-widest font-semibold">Due This Week</p>
          <div className="rounded-2xl bg-amber-500/[0.04] border border-amber-500/15 divide-y divide-white/5">
            {dueSoon.map((b) => <BillRow key={b.id} b={b} />)}
          </div>
        </section>
      )}

      {upcoming.length > 0 && (
        <section className="space-y-2">
          {(overdue.length > 0 || dueSoon.length > 0) && (
            <p className="text-muted-base text-[10px] uppercase tracking-widest font-semibold">Upcoming</p>
          )}
          <div className="rounded-2xl bg-white/[0.03] border border-accent-purple/10 divide-y divide-white/5">
            {upcoming.map((b) => <BillRow key={b.id} b={b} />)}
          </div>
        </section>
      )}
    </div>
  );
}
