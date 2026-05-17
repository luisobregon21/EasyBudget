"use client";
import { useState } from "react";
import { CardSection } from "@/components/payments/card-section";
import { PayCardSheet } from "@/components/payments/pay-card-sheet";
import { ReconcileForm } from "@/components/payments/reconcile-form";
import type { CardWithBalance, CardActivityRow } from "@/lib/actions/card-payments";

interface Props {
  cards: CardWithBalance[];
  activities: Record<number, CardActivityRow[]>;
}

type SheetState =
  | { kind: "none" }
  | { kind: "pay"; cardId: number }
  | { kind: "reconcile"; cardId: number };

export function PaymentsClient({ cards, activities }: Props) {
  const [sheet, setSheet] = useState<SheetState>({ kind: "none" });

  const openPay = (cardId: number) => setSheet({ kind: "pay", cardId });
  const openReconcile = (cardId: number) => setSheet({ kind: "reconcile", cardId });
  const closeSheet = () => setSheet({ kind: "none" });

  const activeCard =
    sheet.kind !== "none" ? cards.find((c) => c.id === sheet.cardId) : undefined;

  return (
    <>
      <div className="space-y-4">
        {cards.map((card) => (
          <div key={card.id} className="relative">
            {/* We use a wrapper to intercept the link clicks and open sheets instead */}
            <CardSectionWithCallbacks
              card={card}
              activity={activities[card.id] ?? []}
              onPay={() => openPay(card.id)}
              onReconcile={() => openReconcile(card.id)}
            />
          </div>
        ))}
      </div>

      {sheet.kind === "pay" && activeCard && (
        <PayCardSheet
          card={activeCard}
          otherMethods={cards}
          onClose={closeSheet}
        />
      )}

      {sheet.kind === "reconcile" && activeCard && (
        <ReconcileForm
          card={activeCard}
          onClose={closeSheet}
        />
      )}
    </>
  );
}

// Thin wrapper to turn CardSection's Link hrefs into button callbacks
function CardSectionWithCallbacks({
  card,
  activity,
  onPay,
  onReconcile,
}: {
  card: CardWithBalance;
  activity: CardActivityRow[];
  onPay: () => void;
  onReconcile: () => void;
}) {
  const isHighBalance = card.balance > 1000;
  const recent = activity.slice(0, 8);

  return (
    <CardSectionInline
      card={card}
      activity={recent}
      isHighBalance={isHighBalance}
      onPay={onPay}
      onReconcile={onReconcile}
    />
  );
}

// Inline version of CardSection that uses callbacks instead of Links
import { CreditCard, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { IconTile } from "@/components/ui/icon-tile";
import { formatCurrency } from "@/lib/utils";

function CardSectionInline({
  card,
  activity,
  isHighBalance,
  onPay,
  onReconcile,
}: {
  card: CardWithBalance;
  activity: CardActivityRow[];
  isHighBalance: boolean;
  onPay: () => void;
  onReconcile: () => void;
}) {
  return (
    <div className="relative rounded-2xl bg-card border border-cardEdge overflow-hidden">
      {/* subtle gold radial glow */}
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
          {isHighBalance && (
            <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/15 text-red-400 border border-red-500/20">
              high balance
            </span>
          )}
        </div>

        {/* Balance */}
        <div>
          <p className="text-[9px] font-bold tracking-[0.15em] uppercase text-muted-base mb-1">Current balance</p>
          <p className="gradient-text text-3xl font-black tracking-tight">
            {formatCurrency(card.balance)}
          </p>
          <p className="text-xs text-muted-base mt-1">
            <span className="text-red-400">+{formatCurrency(card.thisMonthCharges)}</span>
            {" charges · "}
            <span className="text-emerald-400">−{formatCurrency(card.thisMonthPayments)}</span>
            {" payments this month"}
          </p>
        </div>

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
        {activity.length > 0 && (
          <div className="space-y-1 pt-1">
            <p className="text-[9px] font-bold tracking-[0.15em] uppercase text-muted-base mb-2">Recent activity</p>
            {activity.map((row) => {
              const isCharge = row.kind === "expense";
              return (
                <div key={`${row.kind}-${row.id}`} className="flex items-center gap-3 py-1.5">
                  <IconTile
                    icon={isCharge ? ArrowUpRight : ArrowDownRight}
                    tone={isCharge ? "bad" : "good"}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground text-sm truncate">{row.description}</p>
                    <p className="text-muted-base text-[10px]">
                      {row.date} · {row.kind}
                    </p>
                  </div>
                  <p className={`text-sm font-semibold tabular-nums shrink-0 ${isCharge ? "text-red-400" : "text-emerald-400"}`}>
                    {isCharge ? "+" : "−"}{formatCurrency(Math.abs(row.amount))}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {activity.length === 0 && (
          <p className="text-muted-base text-xs text-center py-2">No activity yet.</p>
        )}
      </div>
    </div>
  );
}
