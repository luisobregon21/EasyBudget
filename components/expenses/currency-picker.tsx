"use client";
import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";

const CURRENCIES = ["USD", "NIO", "GTQ", "MXN", "EUR", "GBP", "CAD"];

export function CurrencyPicker({ defaultCurrency = "USD", defaultAmount = "" }: { defaultCurrency?: string; defaultAmount?: string }) {
  const [currency, setCurrency] = useState(defaultCurrency);
  const [amount, setAmount]     = useState(defaultAmount);
  const [rate, setRate]         = useState(1);
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    if (currency === "USD") { setRate(1); return; }
    setLoading(true);
    fetch(`/api/exchange-rate?currency=${currency}`)
      .then((r) => r.json())
      .then((d) => setRate(d.rate))
      .finally(() => setLoading(false));
  }, [currency]);

  const amountUsd = amount ? parseFloat(amount) / rate : 0;

  return (
    <div className="space-y-2">
      <input type="hidden" name="currency" value={currency} />
      <div className="flex gap-2">
        <select value={currency} onChange={(e) => setCurrency(e.target.value)}
          className="bg-violet-500/15 border border-violet-500/30 text-violet-300 rounded-xl px-3 py-2.5 text-sm font-semibold">
          {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input name="amount" type="number" step="0.01" min="0" required
          value={amount} onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className="flex-1 bg-bg-deep border border-accent-purple/20 text-foreground rounded-xl px-4 py-2.5 text-lg font-bold" />
      </div>
      {currency !== "USD" && amount && (
        <p className="text-muted-base text-[11px] pl-1">
          {loading ? "Fetching rate…" : `≈ ${formatCurrency(amountUsd)} USD · rate: ${rate.toFixed(4)}`}
        </p>
      )}
    </div>
  );
}
