"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";
import { updateCreditCard } from "@/lib/actions/credit-cards";
import { Input } from "@/components/ui/input";

interface Props {
  cardId: number;
  cardName: string;
  dueDay: number | null;
  creditLimit: number | null;
}

export function EditCardLimit({ cardId, cardName, dueDay, creditLimit }: Props) {
  const [open, setOpen] = useState(false);
  const action = updateCreditCard.bind(null, cardId);
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
        className="text-muted-base hover:text-foreground transition-colors"
        aria-label="Edit card"
      >
        <Pencil size={14} />
      </button>
    );
  }

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="name" value={cardName} />
      <input type="hidden" name="dueDay" value={dueDay ?? ""} />
      <Input
        name="creditLimit"
        type="number"
        step="0.01"
        min="0"
        defaultValue={creditLimit ?? ""}
        placeholder="Limit"
        className="bg-bg-deep border-accent-purple/20 text-foreground w-24 text-xs h-8"
        autoFocus
      />
      <button
        type="submit"
        disabled={pending}
        className="text-emerald-400 hover:text-emerald-300 disabled:opacity-50"
        aria-label="Save"
      >
        <Check size={16} />
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-muted-base hover:text-foreground"
        aria-label="Cancel"
      >
        <X size={16} />
      </button>
    </form>
  );
}
