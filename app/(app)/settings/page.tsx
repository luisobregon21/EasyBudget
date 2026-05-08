import { getCreditCards, createCreditCard, deleteCreditCard } from "@/lib/actions/credit-cards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, CreditCard } from "lucide-react";

export default async function SettingsPage() {
  const cards = await getCreditCards();

  async function handleDeleteCard(cardId: number) {
    "use server";
    await deleteCreditCard(cardId);
  }

  return (
    <div className="space-y-8 max-w-lg">
      <div>
        <h2 className="text-foreground text-xl font-bold">Settings</h2>
        <p className="text-muted-base text-sm">Manage your account preferences</p>
      </div>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <CreditCard size={16} className="text-accent-purple-light" />
          <h3 className="text-foreground font-semibold">Credit Cards</h3>
        </div>

        <div className="rounded-2xl bg-white/[0.03] border border-accent-purple/10 divide-y divide-white/5">
          {cards.length === 0 && (
            <p className="text-muted-base text-sm text-center py-6">No credit cards added yet.</p>
          )}
          {cards.map((card) => (
            <div key={card.id} className="flex items-center justify-between p-4">
              <div>
                <p className="text-foreground font-medium">{card.name}</p>
                <p className="text-muted-base text-xs">Due day {card.dueDay}</p>
              </div>
              <form action={handleDeleteCard.bind(null, card.id)}>
                <button type="submit" className="text-muted-base hover:text-red-400 transition-colors">
                  <Trash2 size={15} />
                </button>
              </form>
            </div>
          ))}
        </div>

        <form action={createCreditCard} className="rounded-2xl bg-white/[0.03] border border-accent-purple/10 p-4 space-y-3">
          <p className="text-muted-base text-xs uppercase tracking-widest">Add a Card</p>
          <div className="flex gap-3">
            <div className="flex-1 space-y-1">
              <Label className="text-muted-base text-[10px] uppercase tracking-widest">Card Name</Label>
              <Input name="name" required placeholder="Chase Sapphire"
                className="bg-bg-deep border-accent-purple/20 text-foreground" />
            </div>
            <div className="w-24 space-y-1">
              <Label className="text-muted-base text-[10px] uppercase tracking-widest">Due Day</Label>
              <Input name="dueDay" type="number" min="1" max="31" required placeholder="15"
                className="bg-bg-deep border-accent-purple/20 text-foreground" />
            </div>
          </div>
          <Button type="submit" className="bg-gradient-brand text-white font-bold w-full">
            Add Card
          </Button>
        </form>
      </section>
    </div>
  );
}
