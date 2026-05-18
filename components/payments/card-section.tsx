"use client";
import { CreditCard, ArrowUpRight, ArrowDownRight, ImagePlus } from "lucide-react";
import { IconTile } from "@/components/ui/icon-tile";
import { formatCurrency } from "@/lib/utils";
import type { CardWithBalance, CardActivityRow } from "@/lib/actions/card-payments";
import type { UtilizationBand } from "@/lib/credit-utilization";

const BAND_META: Record<UtilizationBand, { label: string; cls: string; bar: string }> = {
  excellent: { label: "Excellent",  cls: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25",  bar: "bg-emerald-400"  },
  good:      { label: "Good",       cls: "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20", bar: "bg-emerald-300"  },
  moderate:  { label: "Moderate",   cls: "bg-amber-500/15  text-amber-300  border border-amber-500/25",    bar: "bg-amber-400"    },
  high:      { label: "High",       cls: "bg-orange-500/15 text-orange-400 border border-orange-500/25",   bar: "bg-orange-400"   },
  very_high: { label: "Very High",  cls: "bg-red-500/20    text-red-400    border border-red-500/30",      bar: "bg-red-500"      },
};

interface Props {
  card: CardWithBalance;
  activity: CardActivityRow[];
  onPay: () => void;
  onReconcile: () => void;
  onEditPayment: (row: CardActivityRow) => void;
  onAddReceipt: (row: CardActivityRow) => void;
  onViewReceipt: (row: CardActivityRow) => void;
}

export function CardSection({
  card,
  activity,
  onPay,
  onReconcile,
  onEditPayment,
  onAddReceipt,
  onViewReceipt,
}: Props) {
  const recent = activity.slice(0, 8);
  const band = card.utilizationBand ? BAND_META[card.utilizationBand] : null;
  const barPct = card.utilizationPct != null ? Math.min(100, card.utilizationPct) : null;

  return (
    <div className="relative rounded-2xl bg-card border border-cardEdge overflow-hidden">
      <div
        className="pointer-events-none absolute -top-16 -right-16 w-48 h-48 rounded-full opacity-10"
        style={{ background: "radial-gradient(circle, #f59e0b 0%, transparent 70%)" }}
      />

      <div className="relative p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <IconTile icon={CreditCard} tone="warn" size="md" />
            <div>
              <p className="text-foreground font-bold text-base leading-tight">{card.name}</p>
              {card.dueDay != null && (
                <p className="text-muted-base text-xs mt-0.5">Due day {card.dueDay}</p>
              )}
            </div>
          </div>
          {band && card.utilizationPct != null && (
            <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${band.cls}`}>
              {card.utilizationPct}% · {band.label}
            </span>
          )}
        </div>

        {/* Balance */}
        <div>
          <p className="text-[9px] font-bold tracking-[0.15em] uppercase text-muted-base mb-1">Current balance</p>
          <p className="gradient-text text-3xl font-black tracking-tight">
            {formatCurrency(card.balance)}
          </p>
          {card.creditLimit != null && card.creditLimit > 0 && (
            <p className="text-[10px] text-muted-base mt-1">
              of {formatCurrency(card.creditLimit)} limit
            </p>
          )}
          <p className="text-xs text-muted-base mt-1">
            <span className="text-red-400">
              {card.thisMonthCharges > 0 ? "+" : ""}{formatCurrency(card.thisMonthCharges)}
            </span>
            {" charges · "}
            <span className="text-emerald-400">
              {card.thisMonthPayments > 0 ? "−" : ""}{formatCurrency(card.thisMonthPayments)}
            </span>
            {" payments this month"}
          </p>
        </div>

        {/* Utilization bar */}
        {band && barPct != null && (
          <div className="space-y-1">
            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div
                className={`h-full ${band.bar} transition-all`}
                style={{ width: `${barPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onPay}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-center text-white bg-gradient-to-br from-amber-400 to-pink-500 shadow-md shadow-amber-500/20 hover:opacity-90 transition-opacity"
          >
            Pay this card
          </button>
          <button
            type="button"
            onClick={onReconcile}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-muted-base border border-accent-purple/20 hover:text-foreground hover:bg-white/5 transition-colors"
          >
            Reconcile
          </button>
        </div>

        {/* Activity */}
        {recent.length > 0 ? (
          <div className="space-y-1 pt-1">
            <p className="text-[9px] font-bold tracking-[0.15em] uppercase text-muted-base mb-2">Recent activity</p>
            {recent.map((row) => (
              <ActivityRow
                key={`${row.kind}-${row.id}`}
                row={row}
                onEditPayment={onEditPayment}
                onAddReceipt={onAddReceipt}
                onViewReceipt={onViewReceipt}
              />
            ))}
          </div>
        ) : (
          <p className="text-muted-base text-xs text-center py-2">No activity yet.</p>
        )}
      </div>
    </div>
  );
}

function ActivityRow({
  row,
  onEditPayment,
  onAddReceipt,
  onViewReceipt,
}: {
  row: CardActivityRow;
  onEditPayment: (row: CardActivityRow) => void;
  onAddReceipt: (row: CardActivityRow) => void;
  onViewReceipt: (row: CardActivityRow) => void;
}) {
  const isCharge = row.kind === "expense";
  const isPayment = row.kind === "payment";
  const offset = row.daysOffset;
  const offsetChip =
    isPayment && offset != null
      ? offset < 0
        ? { label: `${Math.abs(offset)}d early`, cls: "text-emerald-400 bg-emerald-500/10" }
        : offset > 0
          ? { label: `${offset}d late`, cls: "text-red-400 bg-red-500/10" }
          : { label: "on time", cls: "text-muted-base bg-white/5" }
      : null;

  const editable = isPayment || row.kind === "adjustment";

  const content = (
    <>
      <IconTile
        icon={isCharge ? ArrowUpRight : ArrowDownRight}
        tone={isCharge ? "bad" : "good"}
        size="sm"
      />
      <div className="flex-1 min-w-0">
        <p className="text-foreground text-sm truncate">{row.description}</p>
        <p className="text-muted-base text-[10px] flex items-center gap-1.5 flex-wrap">
          <span>{row.date} · {row.kind}</span>
          {offsetChip && (
            <span className={`px-1.5 py-px rounded-full text-[9px] font-semibold ${offsetChip.cls}`}>
              {offsetChip.label}
            </span>
          )}
        </p>
      </div>

      {isPayment && row.receiptUrl ? (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onViewReceipt(row); }}
          className="shrink-0 w-8 h-8 rounded-lg overflow-hidden border border-accent-purple/20 hover:border-accent-purple/40 transition-colors"
          aria-label="View receipt"
        >
          <img src={`/api/receipts/${row.id}`} alt="receipt" className="w-full h-full object-cover" />
        </button>
      ) : isPayment ? (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onAddReceipt(row); }}
          className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-muted-base hover:text-foreground hover:bg-white/5 transition-colors"
          aria-label="Add receipt"
        >
          <ImagePlus size={14} />
        </button>
      ) : null}

      <p className={`text-sm font-semibold tabular-nums shrink-0 ${isCharge ? "text-red-400" : "text-emerald-400"}`}>
        {row.amount === 0 ? "" : isCharge ? "+" : "−"}{formatCurrency(Math.abs(row.amount))}
      </p>
    </>
  );

  if (editable) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => onEditPayment(row)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onEditPayment(row);
          }
        }}
        className="w-full flex items-center gap-3 py-1.5 px-1 -mx-1 rounded-lg hover:bg-white/5 transition-colors text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-gold"
      >
        {content}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 py-1.5">
      {content}
    </div>
  );
}
