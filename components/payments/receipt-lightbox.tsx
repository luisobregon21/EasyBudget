"use client";
import { X } from "lucide-react";
import type { CardActivityRow } from "@/lib/actions/card-payments";
import { formatCurrency } from "@/lib/utils";

interface Props {
  payment: CardActivityRow;
  onClose: () => void;
}

export function ReceiptLightbox({ payment, onClose }: Props) {
  return (
    <>
      <div
        className="fixed inset-0 z-[80] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
        >
          <X size={20} />
        </button>
        <img
          src={`/api/receipts/${payment.id}`}
          alt="receipt"
          className="max-w-full max-h-[80vh] rounded-2xl shadow-2xl object-contain"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
      <div className="fixed bottom-6 inset-x-0 z-[81] flex justify-center pointer-events-none">
        <div className="bg-black/60 backdrop-blur px-4 py-2 rounded-full text-white text-sm space-x-2">
          <span className="font-semibold">{formatCurrency(Math.abs(payment.amount))}</span>
          <span className="text-white/70">·</span>
          <span className="text-white/70">{payment.date}</span>
        </div>
      </div>
    </>
  );
}
