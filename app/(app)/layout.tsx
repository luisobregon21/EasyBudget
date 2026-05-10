import { requireSession } from "@/lib/auth/session";
import { AppShell } from "@/components/layout/app-shell";
import { getCreditCards } from "@/lib/actions/credit-cards";
import { getUserTags } from "@/lib/actions/tags";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireSession();
  const [paymentMethods, tags] = await Promise.all([getCreditCards(), getUserTags()]);

  return (
    <div className="min-h-screen bg-gradient-app flex">
      <AppShell paymentMethods={paymentMethods} tags={tags as any}>
        {children}
      </AppShell>
    </div>
  );
}
