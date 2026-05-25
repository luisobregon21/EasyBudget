import { getOrCreateMonth } from "@/lib/actions/months";
import { getExpensesForMonth, deleteExpense } from "@/lib/actions/expenses";
import { currentYearMonth, formatCurrency } from "@/lib/utils";
import { MonthSwitcher } from "@/components/layout/month-switcher";
import { FireAndForgetButton } from "@/components/ui/fire-and-forget-button";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { SwipeableRow } from "@/components/expenses/swipeable-row";

type Bucket = "savings" | "bills" | "wants";
const BUCKETS: { label: string; value: Bucket | null }[] = [
  { label: "All",     value: null      },
  { label: "Bills",   value: "bills"   },
  { label: "Wants",   value: "wants"   },
  { label: "Savings", value: "savings" },
];

const BUCKET_COLOR: Record<string, string> = {
  savings: "text-amber-400",
  bills:   "text-pink-400",
  wants:   "text-violet-400",
};

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; bucket?: string }>;
}) {
  const params = await searchParams;
  const def = currentYearMonth();
  const year  = parseInt(params.year  ?? String(def.year));
  const month = parseInt(params.month ?? String(def.month));
  const bucket: Bucket | null =
    params.bucket === "savings" || params.bucket === "bills" || params.bucket === "wants"
      ? params.bucket
      : null;

  const monthData  = await getOrCreateMonth(year, month);
  const expenseList = await getExpensesForMonth(monthData.id, bucket ?? undefined);

  const total = expenseList.reduce((s, e) => s + e.amountUsd, 0);

  function bucketHref(b: Bucket | null) {
    const sp = new URLSearchParams();
    if (params.year)  sp.set("year",  params.year);
    if (params.month) sp.set("month", params.month);
    if (b) sp.set("bucket", b);
    const qs = sp.toString();
    return qs ? `/expenses?${qs}` : "/expenses";
  }

  // Group by date
  const grouped: Record<string, typeof expenseList> = {};
  for (const e of expenseList) {
    if (!grouped[e.date]) grouped[e.date] = [];
    grouped[e.date].push(e);
  }
  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-foreground text-xl font-bold">Expenses</h2>
          <p className="text-muted-base text-sm">
            {formatCurrency(total)} spent{bucket && ` · ${bucket}`}
          </p>
        </div>
        <MonthSwitcher year={year} month={month} />
      </div>

      {/* Bucket tab strip */}
      <div className="border-b border-accent-purple/13 flex gap-1 overflow-x-auto">
        {BUCKETS.map((b) => {
          const active = b.value === bucket;
          return (
            <Link
              key={b.label}
              href={bucketHref(b.value)}
              className={`relative px-3 py-2.5 text-xs whitespace-nowrap transition-colors ${
                active ? "font-bold text-foreground" : "font-medium text-muted-base hover:text-foreground"
              }`}
            >
              {b.label}
              {active && (
                <span className="absolute -bottom-px left-1.5 right-1.5 h-0.5 rounded bg-gradient-to-r from-amber-400 to-pink-500" />
              )}
            </Link>
          );
        })}
      </div>

      {expenseList.length === 0 && (
        <p className="text-muted-base text-sm text-center py-12">
          {bucket ? `No ${bucket} expenses this month.` : "No expenses this month."}
        </p>
      )}

      <div className="space-y-5">
        {dates.map((date) => (
          <div key={date}>
            <p className="text-muted-base text-[10px] uppercase tracking-widest mb-2">
              {new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            </p>
            <div className="rounded-2xl bg-white/[0.03] border border-accent-purple/10 divide-y divide-white/5">
              {grouped[date].map((e) => {
                const rowLink = (
                  <Link
                    href={`/expenses/${e.id}/edit`}
                    className="flex-1 flex items-center justify-between gap-3 px-3 py-3 rounded-lg hover:bg-white/5 transition-colors min-w-0"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xl shrink-0">{e.tagEmoji ?? "📦"}</span>
                      <div className="min-w-0">
                        <p className="text-foreground text-sm font-medium truncate">{e.description}</p>
                        <p className="text-muted-base text-[10px]">
                          {e.tagName ?? "Uncategorized"}
                          <span className={`ml-1.5 font-semibold ${BUCKET_COLOR[e.bucket] ?? ""}`}>· {e.bucket}</span>
                          {e.tripName && <span className="ml-1.5">· ✈️ {e.tripName}</span>}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {e.currency !== "USD" ? (
                        <>
                          <p className="text-red-400 font-bold text-sm">
                            {e.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {e.currency}
                          </p>
                          <p className="text-muted-base text-[10px]">
                            {formatCurrency(e.amountUsd)} USD
                          </p>
                        </>
                      ) : (
                        <p className="text-red-400 font-bold text-sm">{formatCurrency(e.amountUsd)}</p>
                      )}
                    </div>
                  </Link>
                );

                return (
                  <div key={e.id}>
                    {/* Mobile: swipe-to-delete */}
                    <SwipeableRow
                      label={`${e.description} ${formatCurrency(e.amountUsd)}`}
                      expenseId={e.id}
                    >
                      <div className="flex items-stretch gap-1 p-1">{rowLink}</div>
                    </SwipeableRow>

                    {/* Desktop: trashcan stays visible */}
                    <div className="hidden md:flex items-stretch gap-1 p-1">
                      {rowLink}
                      <FireAndForgetButton
                        action={deleteExpense.bind(null, e.id)}
                        className="px-3 text-muted-base hover:text-red-400 transition-colors flex items-center"
                      >
                        <Trash2 size={14} />
                      </FireAndForgetButton>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
