import { formatCurrency } from "@/lib/utils";

const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

type Bill = {
  id: number; name: string; amount: number; dueDay: number; type: string;
  frequency?: string; renewalMonth?: number | null; renewalDay?: number | null;
};

const TYPE_ICON: Record<string, string> = {
  utility: "💡", subscription: "📺", credit_card: "💳", loan: "🏦", other: "📋",
};

export function UpcomingBillsStrip({ bills }: { bills: Bill[] }) {
  if (bills.length === 0) return null;
  const today = new Date().getDate();

  return (
    <div className="rounded-2xl bg-white/[0.03] border border-accent-purple/10 p-5">
      <h3 className="text-accent-purple-light text-[10px] uppercase tracking-widest font-semibold mb-3">
        Due Soon
      </h3>
      <div className="space-y-2">
        {bills.map((b) => {
          const isYearly = b.frequency === "yearly";
          const dueDay = isYearly ? (b.renewalDay ?? 1) : b.dueDay;
          const daysUntil = dueDay >= today ? dueDay - today : 31 - today + dueDay;
          const dueDateLabel = isYearly
            ? `${MONTHS_SHORT[(b.renewalMonth ?? 1) - 1]} ${b.renewalDay}`
            : `day ${b.dueDay}`;
          return (
            <div key={b.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
              <div className="flex items-center gap-3">
                <span className="text-lg">{TYPE_ICON[b.type] ?? "📋"}</span>
                <div>
                  <p className="text-foreground text-sm font-medium">{b.name}</p>
                  <p className="text-muted-base text-[10px]">
                    Due {daysUntil === 0 ? "today" : `in ${daysUntil} day${daysUntil === 1 ? "" : "s"}`} ({dueDateLabel})
                  </p>
                </div>
              </div>
              <span className="text-amber-400 font-semibold text-sm">{formatCurrency(b.amount)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
