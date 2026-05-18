"use client";
import { useState } from "react";
import { CardSection } from "@/components/payments/card-section";
import { PayCardSheet } from "@/components/payments/pay-card-sheet";
import { ReconcileForm } from "@/components/payments/reconcile-form";
import { EditPaymentSheet } from "@/components/payments/edit-payment-sheet";
import { AddReceiptSheet } from "@/components/payments/add-receipt-sheet";
import { ReceiptLightbox } from "@/components/payments/receipt-lightbox";
import type { CardWithBalance, CardActivityRow } from "@/lib/actions/card-payments";

interface Props {
  cards: CardWithBalance[];
  activities: Record<number, CardActivityRow[]>;
}

type SheetState =
  | { kind: "none" }
  | { kind: "pay"; cardId: number }
  | { kind: "reconcile"; cardId: number }
  | { kind: "edit"; payment: CardActivityRow }
  | { kind: "addReceipt"; payment: CardActivityRow }
  | { kind: "viewReceipt"; payment: CardActivityRow };

export function PaymentsClient({ cards, activities }: Props) {
  const [sheet, setSheet] = useState<SheetState>({ kind: "none" });

  const closeSheet = () => setSheet({ kind: "none" });

  const activeCard =
    sheet.kind === "pay" || sheet.kind === "reconcile"
      ? cards.find((c) => c.id === sheet.cardId)
      : undefined;

  return (
    <>
      <div className="space-y-4">
        {cards.map((card) => (
          <CardSection
            key={card.id}
            card={card}
            activity={activities[card.id] ?? []}
            onPay={() => setSheet({ kind: "pay", cardId: card.id })}
            onReconcile={() => setSheet({ kind: "reconcile", cardId: card.id })}
            onEditPayment={(payment) => setSheet({ kind: "edit", payment })}
            onAddReceipt={(payment) => setSheet({ kind: "addReceipt", payment })}
            onViewReceipt={(payment) => setSheet({ kind: "viewReceipt", payment })}
          />
        ))}
      </div>

      {sheet.kind === "pay" && activeCard && (
        <PayCardSheet card={activeCard} otherMethods={cards} onClose={closeSheet} />
      )}
      {sheet.kind === "reconcile" && activeCard && (
        <ReconcileForm card={activeCard} onClose={closeSheet} />
      )}
      {sheet.kind === "edit" && (
        <EditPaymentSheet payment={sheet.payment} onClose={closeSheet} />
      )}
      {sheet.kind === "addReceipt" && (
        <AddReceiptSheet payment={sheet.payment} onClose={closeSheet} />
      )}
      {sheet.kind === "viewReceipt" && (
        <ReceiptLightbox payment={sheet.payment} onClose={closeSheet} />
      )}
    </>
  );
}
