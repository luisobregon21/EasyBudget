import { createTrip } from "@/lib/actions/trips";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

const CURRENCIES = ["USD", "NIO", "GTQ", "MXN", "EUR", "GBP", "CAD"];

export default function NewTripPage() {
  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/trips" className="text-muted-base hover:text-foreground"><ChevronLeft size={20} /></Link>
        <h2 className="text-foreground text-xl font-bold">Plan a Trip</h2>
      </div>
      <form action={createTrip} className="space-y-5">
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
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-muted-base text-[10px] uppercase tracking-widest">Start Date</Label>
            <Input name="startDate" type="date" required className="bg-bg-deep border-accent-purple/20 text-foreground" />
          </div>
          <div className="space-y-1">
            <Label className="text-muted-base text-[10px] uppercase tracking-widest">End Date</Label>
            <Input name="endDate" type="date" required className="bg-bg-deep border-accent-purple/20 text-foreground" />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-muted-base text-[10px] uppercase tracking-widest">Trip Budget (USD)</Label>
          <Input name="budgetUsd" type="number" step="0.01" min="0" required placeholder="800.00"
            className="bg-bg-deep border-accent-purple/20 text-foreground" />
        </div>
        <div className="space-y-1">
          <Label className="text-muted-base text-[10px] uppercase tracking-widest">Primary Local Currency</Label>
          <select name="primaryCurrency"
            className="w-full bg-bg-deep border border-accent-purple/20 text-foreground rounded-xl px-4 py-2.5">
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <Button type="submit" className="w-full bg-gradient-brand text-white font-bold py-3 rounded-xl">
          Create Trip
        </Button>
      </form>
    </div>
  );
}
