import { updateIncomeEntryStatus } from "@/lib/actions/income";
import { formatCurrency } from "@/lib/utils";

type Entry = {
  id: number; name: string; amount: number; status: string;
  expectedDate: string; arrivedDate: string | null; sourceId: number | null;
};

const STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  arrived:     { label: "Arrived",      cls: "bg-green-500/15 text-green-400" },
  expected:    { label: "Expected",     cls: "bg-amber-500/15 text-amber-400" },
  might_arrive:{ label: "Might Arrive", cls: "bg-white/[0.06] text-muted-base" },
};

export function IncomeEntryList({ entries }: { entries: Entry[] }) {
  if (entries.length === 0) {
    return <p className="text-muted-base text-sm text-center py-6">No income entries this month.</p>;
  }

  return (
    <div className="rounded-2xl bg-white/[0.03] border border-accent-purple/10 divide-y divide-white/5">
      {entries.map((e) => {
        const s = STATUS_STYLE[e.status] ?? STATUS_STYLE.might_arrive;
        const dateLabel = new Date(e.expectedDate + "T00:00:00").toLocaleDateString("en-US", {
          month: "short", day: "numeric",
        });

        async function markArrived() {
          "use server";
          await updateIncomeEntryStatus(e.id, "arrived");
        }

        return (
          <div key={e.id} className="flex items-center justify-between p-4 gap-3">
            <div className="min-w-0">
              <p className="text-foreground font-medium truncate">{e.name}</p>
              <p className="text-muted-base text-xs">Expected {dateLabel}</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-amber-400 font-bold">{formatCurrency(e.amount)}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${s.cls}`}>
                {s.label}
              </span>
              {e.status !== "arrived" && (
                <form action={markArrived}>
                  <button type="submit" className="text-[10px] text-green-400 hover:text-green-300 underline">
                    Mark arrived
                  </button>
                </form>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
