"use client";

import { updateIncomeEntryStatus } from "@/lib/actions/income";
import { formatCurrency } from "@/lib/utils";
import { FireAndForgetButton } from "@/components/ui/fire-and-forget-button";

type Entry = { id: number; name: string; amount: number; expectedDate: string };

export function OverdueBanner({ entry }: { entry: Entry }) {
  const date = new Date(entry.expectedDate + "T00:00:00").toLocaleDateString("en-US", {
    month: "short", day: "numeric",
  });

  return (
    <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 flex items-start justify-between gap-3">
      <p className="text-amber-400 text-sm">
        ⚠️ <strong>{formatCurrency(entry.amount)}</strong> from <strong>{entry.name}</strong> was expected {date}. Did it arrive?
      </p>
      <div className="flex gap-2 shrink-0">
        <FireAndForgetButton
          action={() => updateIncomeEntryStatus(entry.id, "arrived")}
          className="text-xs text-green-400 hover:text-green-300 underline whitespace-nowrap"
        >
          Yes
        </FireAndForgetButton>
        <FireAndForgetButton
          action={() => updateIncomeEntryStatus(entry.id, "might_arrive")}
          className="text-xs text-muted-base hover:text-foreground underline whitespace-nowrap"
        >
          No, remove
        </FireAndForgetButton>
      </div>
    </div>
  );
}
