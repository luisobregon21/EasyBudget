"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { createCardPayment } from "@/lib/actions/card-payments";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { CardWithBalance } from "@/lib/actions/card-payments";

interface Props {
  card: CardWithBalance;
  otherMethods: CardWithBalance[];
  onClose: () => void;
}

export function PayCardSheet({ card, otherMethods, onClose }: Props) {
  const today = new Date().toISOString().split("T")[0];
  const [paidFrom, setPaidFrom] = useState<string>("cash");
  const [formKey, setFormKey] = useState(0);

  const [state, action, pending] = useActionState(createCardPayment, undefined);
  const toastedState = useRef<typeof state>(undefined);

  useEffect(() => {
    if (!state || state === toastedState.current) return;
    toastedState.current = state;
    if (state.success) {
      toast.success(state.message);
      onClose();
      setFormKey((k) => k + 1);
    } else {
      toast.error(state.message);
    }
  }, [state, onClose]);

  return (
    <>
      {/* backdrop */}
      <div className="fixed inset-0 bg-black/60 z-[60]" onClick={onClose} />

      {/* sheet */}
      <div className="fixed z-[70] bg-[#1e1235] border border-accent-purple/30 shadow-2xl
        bottom-0 inset-x-0 rounded-t-2xl border-t
        md:bottom-auto md:inset-x-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2
        md:w-full md:max-w-md md:rounded-2xl">
        {/* drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 rounded-full bg-white/20" />
        </div>

        {/* header */}
        <div className="flex items-center justify-between px-5 py-3">
          <div>
            <p className="text-foreground font-bold text-base">Pay {card.name}</p>
            <p className="text-muted-base text-xs">Balance: ${card.balance.toFixed(2)}</p>
          </div>
          <button type="button" onClick={onClose} className="text-muted-base hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        <form key={formKey} action={action} className="px-5 pb-8 space-y-4">
          <input type="hidden" name="creditCardId" value={card.id} />

          {/* amount — big centered */}
          <div className="text-center">
            <p className="text-muted-base text-[10px] uppercase tracking-widest mb-2">Amount</p>
            <Input
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              required
              placeholder="0.00"
              className="bg-bg-deep border-accent-purple/20 text-foreground text-2xl font-black text-center"
            />
          </div>

          {/* paid from */}
          <div className="space-y-2">
            <p className="text-muted-base text-[10px] uppercase tracking-widest">Paid from</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setPaidFrom("cash")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  paidFrom === "cash"
                    ? "bg-gradient-to-br from-amber-400 to-pink-500 text-white"
                    : "bg-bg-deep border border-accent-purple/20 text-muted-base hover:text-foreground"
                }`}
              >
                Cash / Bank
              </button>
              {otherMethods.filter((m) => m.id !== card.id).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaidFrom(String(m.id))}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                    paidFrom === String(m.id)
                      ? "bg-gradient-to-br from-amber-400 to-pink-500 text-white"
                      : "bg-bg-deep border border-accent-purple/20 text-muted-base hover:text-foreground"
                  }`}
                >
                  {m.name}
                </button>
              ))}
            </div>
            <input type="hidden" name="paidFromMethodId" value={paidFrom} />
          </div>

          {/* date */}
          <div className="space-y-1">
            <p className="text-muted-base text-[10px] uppercase tracking-widest">Date</p>
            <Input
              name="date"
              type="date"
              defaultValue={today}
              className="bg-bg-deep border-accent-purple/20 text-foreground"
            />
          </div>

          {/* note (optional) */}
          <div className="space-y-1">
            <p className="text-muted-base text-[10px] uppercase tracking-widest">Note (optional)</p>
            <Input
              name="note"
              type="text"
              placeholder="e.g. January statement payment"
              className="bg-bg-deep border-accent-purple/20 text-foreground"
            />
          </div>

          <Button
            type="submit"
            disabled={pending}
            className="w-full bg-gradient-to-br from-amber-400 to-pink-500 text-white font-bold py-3 rounded-xl text-base"
          >
            {pending ? "Recording…" : "Record Payment"}
          </Button>
        </form>
      </div>
    </>
  );
}
