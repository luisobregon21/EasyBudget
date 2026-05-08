"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";

type Method = "cash" | "debit" | "credit_card";

const OPTIONS: { value: Method; label: string; icon: string; note?: string }[] = [
  { value: "cash",        label: "Cash",        icon: "💵" },
  { value: "debit",       label: "Debit Card",  icon: "💳" },
  { value: "credit_card", label: "Credit Card", icon: "💳",
    note: "Logged now against your budget. Your CC bill at month-end is just a payment — no double-counting." },
];

export function PaymentMethodPicker({ defaultValue = "debit" }: { defaultValue?: Method }) {
  const [selected, setSelected] = useState<Method>(defaultValue);
  const note = OPTIONS.find((o) => o.value === selected)?.note;

  return (
    <div className="space-y-2">
      <input type="hidden" name="paymentMethod" value={selected} />
      <div className="flex gap-2 flex-wrap">
        {OPTIONS.map((o) => (
          <button key={o.value} type="button" onClick={() => setSelected(o.value)}
            className={cn(
              "px-4 py-2 rounded-full text-sm border transition-colors",
              selected === o.value
                ? o.value === "cash"
                  ? "bg-green-500/15 border-green-500/40 text-green-400"
                  : o.value === "credit_card"
                    ? "bg-pink-500/15 border-pink-500/40 text-pink-400"
                    : "bg-indigo-500/15 border-indigo-500/40 text-indigo-400"
                : "bg-white/[0.04] border-accent-purple/20 text-muted-base hover:text-foreground"
            )}>
            {o.icon} {o.label}
          </button>
        ))}
      </div>
      {note && (
        <p className="text-[11px] text-accent-purple-light bg-pink-500/[0.08] border border-pink-500/20 rounded-xl p-3 leading-relaxed">
          {note}
        </p>
      )}
    </div>
  );
}
