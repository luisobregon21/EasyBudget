import { getUserBills } from "@/lib/actions/bills";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Trash2, Plus } from "lucide-react";

const TYPE_ICON: Record<string, string> = {
  utility: "💡", subscription: "📺", credit_card: "💳", loan: "🏦", other: "📋",
};

export default async function BillsPage() {
  const billsList = await getUserBills();

  async function handleDelete(id: number) {
    "use server";
    const { deleteBill } = await import("@/lib/actions/bills");
    await deleteBill(id);
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

      <div className="rounded-2xl bg-white/[0.03] border border-accent-purple/10 divide-y divide-white/5">
        {billsList.length === 0 && (
          <p className="text-muted-base text-sm text-center py-8">No bills yet. Add your first one.</p>
        )}
        {billsList.map((b) => (
          <div key={b.id} className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <span className="text-xl">{TYPE_ICON[b.type] ?? "📋"}</span>
              <div>
                <p className="text-foreground font-medium">{b.name}</p>
                <p className="text-muted-base text-xs">Due day {b.dueDay} · {b.reminderDaysBefore}d reminder</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-amber-400 font-bold">{formatCurrency(b.amount)}</span>
              <form action={handleDelete.bind(null, b.id)}>
                <button type="submit" className="text-muted-base hover:text-red-400 transition-colors">
                  <Trash2 size={15} />
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
