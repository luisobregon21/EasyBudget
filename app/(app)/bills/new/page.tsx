import { createBill } from "@/lib/actions/bills";
import { getCreditCards } from "@/lib/actions/credit-cards";
import { BillForm } from "@/components/bills/bill-form";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function NewBillPage() {
  const cards = await getCreditCards();

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/bills" className="text-muted-base hover:text-foreground"><ChevronLeft size={20} /></Link>
        <h2 className="text-foreground text-xl font-bold">Add Bill</h2>
      </div>
      <BillForm creditCards={cards} action={createBill} submitLabel="Add Bill" />
    </div>
  );
}
