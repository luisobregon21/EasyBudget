"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { updateTripDetails } from "@/lib/actions/trips";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const CURRENCIES = ["USD", "NIO", "GTQ", "MXN", "EUR", "GBP", "CAD", "JPY", "CRC", "COP"];

interface Props {
  tripId: number;
  name: string;
  destination: string;
  primaryCurrency: string;
}

export function EditTripDetailsForm({ tripId, name, destination, primaryCurrency }: Props) {
  const [open, setOpen] = useState(false);
  const action = updateTripDetails.bind(null, tripId);
  const [state, formAction, pending] = useActionState(action, undefined);
  const toastedState = useRef<typeof state>(undefined);

  useEffect(() => {
    if (!state || state === toastedState.current) return;
    toastedState.current = state;
    if (state.success) {
      toast.success(state.message);
      setOpen(false);
    } else {
      toast.error(state.message);
    }
  }, [state]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Edit trip details"
        className="inline-flex items-center gap-1 text-muted-base hover:text-foreground transition-colors text-xs"
      >
        <Pencil size={12} />
        Edit details
      </button>
    );
  }

  return (
    <div className="rounded-xl bg-white/[0.04] border border-accent-purple/15 p-4 space-y-3">
      <p className="text-foreground font-semibold text-sm">Edit Trip</p>
      <form action={formAction} className="space-y-3">
        <div className="space-y-1">
          <Label className="text-muted-base text-[10px] uppercase tracking-widest">Name</Label>
          <Input name="name" defaultValue={name} required className="bg-bg-deep border-accent-purple/20 text-foreground" />
        </div>
        <div className="space-y-1">
          <Label className="text-muted-base text-[10px] uppercase tracking-widest">Destination</Label>
          <Input name="destination" defaultValue={destination} required className="bg-bg-deep border-accent-purple/20 text-foreground" />
        </div>
        <div className="space-y-1">
          <Label className="text-muted-base text-[10px] uppercase tracking-widest">
            Primary currency <span className="normal-case text-muted-base font-normal">— defaults when logging expenses</span>
          </Label>
          <select
            name="primaryCurrency"
            defaultValue={primaryCurrency}
            className="w-full bg-bg-deep border border-accent-purple/20 text-foreground rounded-lg px-3 py-2 text-sm"
          >
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            {!CURRENCIES.includes(primaryCurrency) && <option value={primaryCurrency}>{primaryCurrency}</option>}
          </select>
        </div>
        <div className="flex gap-2 justify-end">
          <Button type="button" onClick={() => setOpen(false)} variant="ghost" className="text-muted-base">
            Cancel
          </Button>
          <Button type="submit" disabled={pending} className="bg-gradient-brand text-white font-bold">
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </div>
  );
}
