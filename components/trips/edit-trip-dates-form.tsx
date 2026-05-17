"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { updateTripDates } from "@/lib/actions/trips";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DateField } from "@/components/ui/date-field";

interface Props {
  tripId: number;
  startDate: string;
  endDate: string | null;
}

export function EditTripDatesForm({ tripId, startDate, endDate }: Props) {
  const [open, setOpen] = useState(false);
  const action = updateTripDates.bind(null, tripId);
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
        aria-label="Edit trip dates"
        className="inline-flex items-center gap-1 text-muted-base hover:text-foreground transition-colors text-xs"
      >
        <Pencil size={12} />
        Edit dates
      </button>
    );
  }

  return (
    <div className="rounded-xl bg-white/[0.04] border border-accent-purple/15 p-4 space-y-3">
      <p className="text-foreground font-semibold text-sm">Edit Dates</p>
      <form action={formAction} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-muted-base text-[10px] uppercase tracking-widest">Start date</Label>
            <DateField name="startDate" required defaultValue={startDate} />
          </div>
          <div className="space-y-1">
            <Label className="text-muted-base text-[10px] uppercase tracking-widest">End date</Label>
            <DateField name="endDate" defaultValue={endDate ?? undefined} placeholder="(not set)" />
          </div>
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
