import { createBill } from "@/lib/actions/bills";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function NewBillPage() {
  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/bills" className="text-muted-base hover:text-foreground"><ChevronLeft size={20} /></Link>
        <h2 className="text-foreground text-xl font-bold">Add Bill</h2>
      </div>

      <form action={createBill} className="space-y-5">
        <div className="space-y-1">
          <Label className="text-muted-base text-[10px] uppercase tracking-widest">Name</Label>
          <Input name="name" required placeholder="Netflix" className="bg-bg-deep border-accent-purple/20 text-foreground" />
        </div>
        <div className="space-y-1">
          <Label className="text-muted-base text-[10px] uppercase tracking-widest">Amount (USD)</Label>
          <Input name="amount" type="number" step="0.01" min="0" required placeholder="30.00"
            className="bg-bg-deep border-accent-purple/20 text-foreground" />
        </div>
        <div className="space-y-1">
          <Label className="text-muted-base text-[10px] uppercase tracking-widest">Due Day of Month</Label>
          <Input name="dueDay" type="number" min="1" max="31" required placeholder="8"
            className="bg-bg-deep border-accent-purple/20 text-foreground" />
        </div>
        <div className="space-y-1">
          <Label className="text-muted-base text-[10px] uppercase tracking-widest">Type</Label>
          <select name="type" required
            className="w-full bg-bg-deep border border-accent-purple/20 text-foreground rounded-xl px-4 py-2.5">
            <option value="subscription">Subscription</option>
            <option value="utility">Utility</option>
            <option value="credit_card">Credit Card</option>
            <option value="loan">Loan</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-muted-base text-[10px] uppercase tracking-widest">Remind me (days before)</Label>
          <Input name="reminderDaysBefore" type="number" min="1" max="14" defaultValue="3"
            className="bg-bg-deep border-accent-purple/20 text-foreground" />
        </div>
        <Button type="submit" className="w-full bg-gradient-brand text-white font-bold py-3 rounded-xl">
          Save Bill
        </Button>
      </form>
    </div>
  );
}
