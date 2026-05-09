"use client";

import { useState } from "react";

type SavedMethod = { id: number; name: string; type: string };

interface Props {
  methods: SavedMethod[];
  defaultValue?: string;
}

export function PaymentMethodPicker({ methods, defaultValue = "cash" }: Props) {
  const [selected, setSelected] = useState<string>(defaultValue);

  const allOptions = [
    { id: "cash", name: "Cash", type: "cash" },
    ...methods.map((m) => ({ id: String(m.id), name: m.name, type: m.type })),
  ];

  const selectedOption = allOptions.find((o) => o.id === selected);
  const derivedPaymentMethod =
    selected === "cash" ? "cash" :
    selectedOption?.type === "credit" ? "credit_card" : "debit";

  return (
    <div className="space-y-2">
      <input type="hidden" name="paymentMethodId" value={selected} />
      <input type="hidden" name="paymentMethod" value={derivedPaymentMethod} />
      <div className="flex gap-2 flex-wrap">
        {allOptions.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => setSelected(o.id)}
            className={`px-4 py-2 rounded-full text-sm border transition-colors ${
              selected === o.id
                ? o.type === "cash"
                  ? "bg-green-500/15 border-green-500/40 text-green-400"
                  : o.type === "credit"
                    ? "bg-pink-500/15 border-pink-500/40 text-pink-400"
                    : "bg-indigo-500/15 border-indigo-500/40 text-indigo-400"
                : "bg-white/[0.04] border-accent-purple/20 text-muted-base hover:text-foreground"
            }`}
          >
            {o.type === "cash" ? "💵" : o.type === "credit" ? "💳" : "🏧"} {o.name}
          </button>
        ))}
      </div>
      {selectedOption?.type === "credit" && (
        <p className="text-[11px] text-accent-purple-light bg-pink-500/[0.08] border border-pink-500/20 rounded-xl p-3 leading-relaxed">
          Logged now against your budget. Your CC bill at month-end is just a payment — no double-counting.
        </p>
      )}
    </div>
  );
}
