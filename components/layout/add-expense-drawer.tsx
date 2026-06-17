"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { createExpense } from "@/lib/actions/expenses";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PaymentMethodPicker } from "@/components/expenses/payment-method-picker";
import { TagPickerWrapper } from "@/components/expenses/tag-picker-wrapper";
import { toast } from "sonner";
import { X, ChevronDown, ChevronUp } from "lucide-react";
import { currentYearMonth } from "@/lib/utils";
import { matchTagFromDescription } from "@/lib/tag-matcher";
import { suggestTagFromAI } from "@/lib/actions/tags";

type SavedMethod = { id: number; name: string; type: string };

type Tag = {
  id: number;
  name: string;
  emoji: string;
  defaultBucket: "savings" | "bills" | "wants";
  aliases?: string | null;
};

type BillOption = { id: number; name: string };
type TripOption = { id: number; name: string; primaryCurrency: string };

const CURRENCIES = ["USD", "NIO", "GTQ", "MXN", "EUR", "GBP", "CAD"];

interface Props {
  open: boolean;
  onClose: () => void;
  paymentMethods: SavedMethod[];
  tags: Tag[];
  bills: BillOption[];
  trips: TripOption[];
  /** When set, the trip picker is pre-filled with this trip on open. */
  initialTripId?: number | null;
}

export function AddExpenseDrawer({ open, onClose, paymentMethods, tags, bills, trips, initialTripId }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [description, setDescription] = useState("");
  const [debouncedDesc, setDebouncedDesc] = useState("");
  const [tripId, setTripId] = useState<string>("none");
  const [currency, setCurrency] = useState<string>("USD");
  const { year, month } = currentYearMonth();
  const today = new Date().toISOString().split("T")[0];

  // When the user picks a trip, default the currency to that trip's primary.
  // They can still override per-expense (USD vs local).
  useEffect(() => {
    if (tripId === "none") return;
    const trip = trips.find((t) => String(t.id) === tripId);
    if (trip) setCurrency(trip.primaryCurrency);
  }, [tripId, trips]);

  // Apply caller-provided initialTripId when the drawer opens (e.g. trip page → Add Expense).
  useEffect(() => {
    if (open && initialTripId != null) {
      setTripId(String(initialTripId));
    }
  }, [open, initialTripId]);

  // Debounce the description so we don't run the matcher on every keystroke
  useEffect(() => {
    const t = setTimeout(() => setDebouncedDesc(description), 250);
    return () => clearTimeout(t);
  }, [description]);

  // Source: 'alias' = local matcher, 'ai' = LLM fallback, null = nothing
  const [suggestionState, setSuggestionState] = useState<{
    tagId: number | null;
    source: "alias" | "ai" | null;
  }>({ tagId: null, source: null });

  useEffect(() => {
    if (!debouncedDesc.trim()) {
      setSuggestionState({ tagId: null, source: null });
      return;
    }

    // 1) Try the synchronous keyword matcher first (free + instant)
    const aliasHit = matchTagFromDescription(debouncedDesc, tags)?.id ?? null;
    if (aliasHit != null) {
      setSuggestionState({ tagId: aliasHit, source: "alias" });
      return;
    }

    // 2) Fallback to AI for descriptions the aliases didn't catch.
    //    Race-guarded: ignore the result if the description changed mid-flight.
    let cancelled = false;
    (async () => {
      const choices = tags.map((t) => ({ id: t.id, name: t.name }));
      const result = await suggestTagFromAI(debouncedDesc, choices);
      if (cancelled) return;
      if (result.tagId != null) {
        setSuggestionState({ tagId: result.tagId, source: "ai" });
      } else {
        setSuggestionState({ tagId: null, source: null });
      }
    })();
    return () => { cancelled = true; };
  }, [debouncedDesc, tags]);

  const suggestedTagId = suggestionState.tagId;
  const suggestionSource = suggestionState.source;

  // When a suggestion appears, surface the picker so the user can see/confirm it.
  useEffect(() => {
    if (suggestedTagId != null) setExpanded(true);
  }, [suggestedTagId]);

  const [state, action, pending] = useActionState(createExpense, undefined);
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
  }, [state]);

  useEffect(() => {
    if (!open) {
      setExpanded(false);
      setDescription("");
      setDebouncedDesc("");
      setTripId("none");
      setCurrency("USD");
      toastedState.current = undefined;
      setFormKey((k) => k + 1);
    }
  }, [open]);

  if (!open) return null;

  return (
    <>
      {/* backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-[60]"
        onClick={onClose}
      />

      {/* drawer (mobile = bottom sheet, desktop = centered modal) */}
      <div className="fixed z-[70] bg-[#1e1235] border border-accent-purple/30 shadow-2xl
        bottom-0 inset-x-0 rounded-t-2xl border-t
        md:bottom-auto md:inset-x-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2
        md:w-full md:max-w-md md:rounded-2xl">
        {/* handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 rounded-full bg-white/20" />
        </div>

        {/* header */}
        <div className="flex items-center justify-between px-5 py-3">
          <p className="text-foreground font-bold text-base">Add Expense</p>
          <button type="button" onClick={onClose} className="text-muted-base hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        <form key={formKey} action={action} className="px-5 pb-8 space-y-4">
          <input type="hidden" name="year"  value={year} />
          <input type="hidden" name="month" value={month} />

          {/* amount + currency */}
          <div className="flex gap-2 items-center">
            <select
              name="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="bg-accent-purple/15 border border-accent-purple/30 text-accent-purple-light rounded-xl px-3 py-2.5 text-sm font-semibold"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <Input
              name="amount"
              type="number"
              step="0.01"
              min="0"
              required
              placeholder="0.00"
              className="flex-1 bg-bg-deep border-accent-purple/20 text-foreground text-xl font-bold"
            />
          </div>

          {/* trip picker — visible only when there's at least one active trip */}
          {trips.length > 0 && (
            <div className="space-y-1">
              <p className="text-muted-base text-[10px] uppercase tracking-widest">
                On a trip? <span className="normal-case text-muted-base font-normal">
                  — picks the trip and defaults the currency. You can still pay in USD.
                </span>
              </p>
              <select
                name="tripId"
                value={tripId}
                onChange={(e) => setTripId(e.target.value)}
                className="w-full bg-bg-deep border border-accent-purple/20 text-foreground rounded-lg px-3 py-2 text-sm"
              >
                <option value="none">— No trip —</option>
                {trips.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} ({t.primaryCurrency})</option>
                ))}
              </select>
            </div>
          )}

          {/* description */}
          <Input
            name="description"
            required
            placeholder="What was this for?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="bg-bg-deep border-accent-purple/20 text-foreground"
          />

          {/* date — always visible; defaults to today, easy to change for past or future entries */}
          <div className="space-y-1">
            <p className="text-muted-base text-[10px] uppercase tracking-widest">Date</p>
            <Input
              name="date"
              type="date"
              defaultValue={today}
              className="bg-bg-deep border-accent-purple/20 text-foreground"
            />
          </div>

          {/* payment method */}
          <div className="space-y-2">
            <p className="text-muted-base text-[10px] uppercase tracking-widest">Paid with</p>
            <PaymentMethodPicker methods={paymentMethods} />
          </div>

          {/* more options toggle */}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-2 text-accent-purple-light text-xs w-full justify-center py-1"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {expanded ? "Fewer options" : "More options"}
          </button>

          {/* expanded section */}
          {expanded && (
            <div className="space-y-4 bg-white/[0.03] border border-accent-purple/10 rounded-xl p-4">
              <div className="space-y-1">
                <p className="text-muted-base text-[10px] uppercase tracking-widest">Date</p>
                <Input
                  name="date"
                  type="date"
                  defaultValue={today}
                  className="bg-bg-deep border-accent-purple/20 text-foreground"
                />
              </div>
              <div className="space-y-1">
                <p className="text-muted-base text-[10px] uppercase tracking-widest">Category & Bucket</p>
                <TagPickerWrapper
                  tags={tags}
                  suggestedTagId={suggestedTagId}
                  suggestionSource={suggestionSource}
                />
              </div>
              {bills.length > 0 && (
                <div className="space-y-1">
                  <p className="text-muted-base text-[10px] uppercase tracking-widest">Pays a bill? (optional)</p>
                  <select
                    name="billId"
                    defaultValue="none"
                    className="w-full bg-bg-deep border border-accent-purple/20 text-foreground rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="none">— None —</option>
                    {bills.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* hidden date fallback when not expanded */}
          {!expanded && <input type="hidden" name="date" value={today} />}
          {/* hidden bucket fallback */}
          {!expanded && <input type="hidden" name="bucket" value="wants" />}

          <Button
            type="submit"
            disabled={pending}
            className="w-full bg-gradient-brand text-white font-bold py-3 rounded-xl text-base"
          >
            {pending ? "Saving…" : "Save Expense"}
          </Button>
        </form>
      </div>
    </>
  );
}
