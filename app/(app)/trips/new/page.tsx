"use client";
import { useActionState, useEffect, useRef } from "react";
import { createTrip } from "@/lib/actions/trips";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateField } from "@/components/ui/date-field";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

const CURRENCIES = ["USD", "NIO", "GTQ", "MXN", "EUR", "GBP", "CAD"];

export default function NewTripPage() {
  const [noEndDate, setNoEndDate] = useState(false);
  const [state, action, pending] = useActionState(createTrip, undefined);
  const toasted = useRef(false);

  useEffect(() => {
    if (!state || toasted.current) return;
    toasted.current = true;
    if (!state.success) toast.error(state.message);
  }, [state]);

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/trips" className="text-muted-base hover:text-foreground"><ChevronLeft size={20} /></Link>
        <h2 className="text-foreground text-xl font-bold">Plan a Trip</h2>
      </div>
      <form action={action} className="space-y-5">
        <div className="space-y-1">
          <Label className="text-muted-base text-[10px] uppercase tracking-widest">Trip Name</Label>
          <Input name="name" required placeholder="Nicaragua — May 2026"
            className="bg-bg-deep border-accent-purple/20 text-foreground" />
        </div>
        <div className="space-y-1">
          <Label className="text-muted-base text-[10px] uppercase tracking-widest">Destination</Label>
          <Input name="destination" required placeholder="Managua, Nicaragua"
            className="bg-bg-deep border-accent-purple/20 text-foreground" />
        </div>
        <div className="space-y-1">
          <Label className="text-muted-base text-[10px] uppercase tracking-widest">Start Date</Label>
          <DateField name="startDate" required placeholder="Pick a start date" />
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            name="noEndDate"
            checked={noEndDate}
            onChange={(e) => setNoEndDate(e.target.checked)}
            className="accent-accent-purple-light"
          />
          <span className="text-muted-base text-sm">No end date yet (ongoing trip)</span>
        </label>
        {!noEndDate && (
          <div className="space-y-1">
            <Label className="text-muted-base text-[10px] uppercase tracking-widest">End Date</Label>
            <DateField name="endDate" placeholder="Pick an end date" />
          </div>
        )}
        <div className="space-y-1">
          <Label className="text-muted-base text-[10px] uppercase tracking-widest">Trip Budget (USD) <span className="normal-case text-muted-base font-normal">— optional</span></Label>
          <Input name="budgetUsd" type="number" step="0.01" min="0" placeholder="800.00 — leave blank to plan as you go"
            className="bg-bg-deep border-accent-purple/20 text-foreground" />
        </div>
        <div className="space-y-1">
          <Label className="text-muted-base text-[10px] uppercase tracking-widest">Primary Local Currency</Label>
          <select name="primaryCurrency"
            className="w-full bg-bg-deep border border-accent-purple/20 text-foreground rounded-xl px-4 py-2.5">
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <Button type="submit" disabled={pending} className="w-full bg-gradient-brand text-white font-bold py-3 rounded-xl">
          {pending ? "Creating…" : "Create Trip"}
        </Button>
      </form>
    </div>
  );
}
