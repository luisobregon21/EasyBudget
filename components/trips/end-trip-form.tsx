"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { endTrip } from "@/lib/actions/trips";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { FlagTriangleLeft } from "lucide-react";

interface Props {
  tripId: number;
  startDate: string;
}

export function EndTripForm({ tripId, startDate }: Props) {
  const [open, setOpen] = useState(false);
  const action = endTrip.bind(null, tripId);
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
        className="flex items-center gap-2 text-sm text-muted-base hover:text-foreground transition-colors"
      >
        <FlagTriangleLeft size={14} />
        End this trip
      </button>
    );
  }

  return (
    <div className="rounded-2xl bg-white/[0.03] border border-accent-purple/10 p-5 space-y-4">
      <p className="text-foreground font-semibold">End Trip</p>
      <form action={formAction} className="flex items-end gap-3">
        <div className="flex-1 space-y-1">
          <label className="text-muted-base text-[10px] uppercase tracking-widest">End Date</label>
          <Input
            name="endDate"
            type="date"
            min={startDate}
            required
            className="bg-bg-deep border-accent-purple/20 text-foreground"
          />
        </div>
        <Button type="submit" disabled={pending} className="bg-gradient-brand text-white font-bold">
          {pending ? "Saving…" : "Confirm"}
        </Button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-muted-base hover:text-foreground text-sm"
        >
          Cancel
        </button>
      </form>
    </div>
  );
}
