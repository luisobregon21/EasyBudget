import { updateIncomeEntryStatus } from "@/lib/actions/income";
import { formatCurrency } from "@/lib/utils";

type Entry = { id: number; name: string; amount: number; expectedDate: string };

export function OverdueBanner({ entry }: { entry: Entry }) {
  const date = new Date(entry.expectedDate + "T00:00:00").toLocaleDateString("en-US", {
    month: "short", day: "numeric",
  });

  async function markArrived() {
    "use server";
    await updateIncomeEntryStatus(entry.id, "arrived");
  }

  async function markMightArrive() {
    "use server";
    await updateIncomeEntryStatus(entry.id, "might_arrive");
  }

  return (
    <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 flex items-start justify-between gap-3">
      <p className="text-amber-400 text-sm">
        ⚠️ <strong>{formatCurrency(entry.amount)}</strong> from <strong>{entry.name}</strong> was expected {date}. Did it arrive?
      </p>
      <div className="flex gap-2 shrink-0">
        <form action={markArrived}>
          <button type="submit" className="text-xs text-green-400 hover:text-green-300 underline whitespace-nowrap">
            Yes
          </button>
        </form>
        <form action={markMightArrive}>
          <button type="submit" className="text-xs text-muted-base hover:text-foreground underline whitespace-nowrap">
            No, remove
          </button>
        </form>
      </div>
    </div>
  );
}
