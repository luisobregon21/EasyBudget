import { eq } from "drizzle-orm";
import { Trash2, CreditCard } from "lucide-react";
import { getCreditCards, deleteCreditCard } from "@/lib/actions/credit-cards";
import { FireAndForgetButton } from "@/components/ui/fire-and-forget-button";
import { AddCardForm } from "@/components/settings/credit-card-form";
import { EditCardLimit } from "@/components/settings/edit-card-limit";
import { ProfileSection } from "@/components/settings/profile-section";
import { requireSession } from "@/lib/auth/session";
import { getDb, users } from "@/lib/db";

const TYPE_BADGE: Record<string, string> = {
  credit:    "Credit",
  debit:     "Debit",
  ath_movil: "ATH Móvil",
};

export default async function SettingsPage() {
  const session = await requireSession();
  const db = getDb();
  const [profile] = await db
    .select({ name: users.name, email: users.email, image: users.image })
    .from(users)
    .where(eq(users.id, session.id!))
    .limit(1);

  const cards = await getCreditCards();

  return (
    <div className="space-y-8 max-w-lg">
      <div>
        <h2 className="text-foreground text-xl font-bold">Settings</h2>
        <p className="text-muted-base text-sm">Manage your account preferences</p>
      </div>

      <ProfileSection
        initialName={profile?.name ?? ""}
        initialEmail={profile?.email ?? ""}
        hasAvatar={!!profile?.image}
      />

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <CreditCard size={16} className="text-accent-purple-light" />
          <h3 className="text-foreground font-semibold">Payment Methods</h3>
        </div>

        <div className="rounded-2xl bg-white/[0.03] border border-accent-purple/10 divide-y divide-white/5">
          {cards.length === 0 && (
            <p className="text-muted-base text-sm text-center py-6">No payment methods added yet.</p>
          )}
          {cards.map((card) => (
            <div key={card.id} className="flex items-center justify-between p-4 gap-3">
              <div className="min-w-0">
                <p className="text-foreground font-medium truncate">{card.name}</p>
                <p className="text-muted-base text-xs">
                  {TYPE_BADGE[card.type ?? "credit"] ?? "Credit"}
                  {card.type === "credit" && card.dueDay ? ` · Due day ${card.dueDay}` : ""}
                  {card.type === "credit" && card.creditLimit != null
                    ? ` · Limit $${card.creditLimit.toLocaleString()}`
                    : ""}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {card.type === "credit" && (
                  <EditCardLimit
                    cardId={card.id}
                    cardName={card.name}
                    dueDay={card.dueDay}
                    creditLimit={card.creditLimit}
                  />
                )}
                <FireAndForgetButton
                  action={deleteCreditCard.bind(null, card.id)}
                  className="text-muted-base hover:text-red-400 transition-colors"
                >
                  <Trash2 size={15} />
                </FireAndForgetButton>
              </div>
            </div>
          ))}
        </div>

        <AddCardForm />
      </section>
    </div>
  );
}
