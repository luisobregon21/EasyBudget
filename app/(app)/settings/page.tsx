import { getCreditCards, deleteCreditCard } from "@/lib/actions/credit-cards";
import { CreditCardForm } from "@/components/settings/credit-card-form";
import { FireAndForgetButton } from "@/components/ui/fire-and-forget-button";
import { Trash2, CreditCard } from "lucide-react";

export default async function SettingsPage() {
  const cards = await getCreditCards();

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
              <FireAndForgetButton
                action={() => deleteCreditCard(card.id)}
                className="text-muted-base hover:text-red-400 transition-colors"
              >
                <Trash2 size={15} />
              </FireAndForgetButton>
            </div>
          ))}
        </div>

        <CreditCardForm />
      </section>
    </div>
  );
}
