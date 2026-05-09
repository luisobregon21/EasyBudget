import { getBillById, updateBill } from "@/lib/actions/bills";
import { getCreditCards } from "@/lib/actions/credit-cards";
import { BillForm } from "@/components/bills/bill-form";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function EditBillPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [bill, cards] = await Promise.all([getBillById(parseInt(id)), getCreditCards()]);
  if (!bill) notFound();

  async function handleUpdate(prevState: unknown, formData: FormData) {
    "use server";
    const result = await updateBill(bill!.id, prevState, formData);
    if (result.success) redirect("/bills");
    return result;
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/bills" className="text-muted-base hover:text-foreground"><ChevronLeft size={20} /></Link>
        <h2 className="text-foreground text-xl font-bold">Edit Bill</h2>
      </div>
      <BillForm
        creditCards={cards}
        action={handleUpdate}
        submitLabel="Save Changes"
        defaultValues={{
          name: bill.name,
          amount: bill.amount,
          description: bill.description ?? "",
          frequency: bill.frequency as "monthly" | "yearly",
          dueDay: bill.dueDay,
          renewalMonth: bill.renewalMonth,
          renewalDay: bill.renewalDay,
          type: bill.type,
          creditCardId: bill.creditCardId,
          reminderDaysBefore: bill.reminderDaysBefore,
        }}
      />
    </div>
  );
}
