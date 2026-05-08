import { getDb, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import { signIn } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import bcrypt from "bcryptjs";

export default function RegisterPage() {
  async function register(formData: FormData) {
    "use server";
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const name = formData.get("name") as string;
    if (!email || !password) return;

    const db = getDb();
    const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing) redirect("/login?error=exists");

    const hashed = await bcrypt.hash(password, 10);
    const id = crypto.randomUUID();
    await db.insert(users).values({ id, email, name, password: hashed });

    await signIn("credentials", { email, password, redirectTo: "/" });
  }

  return (
    <div className="min-h-screen bg-gradient-app flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="gradient-text text-3xl font-black tracking-widest">EASYBUDGET</h1>
          <p className="text-muted-foreground mt-2 text-sm">Create your account</p>
        </div>

        <form action={register} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="name" className="text-xs uppercase tracking-wide">Name</Label>
            <Input id="name" name="name" type="text" placeholder="Luis" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="email" className="text-xs uppercase tracking-wide">Email</Label>
            <Input id="email" name="email" type="email" required placeholder="you@example.com" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password" className="text-xs uppercase tracking-wide">Password</Label>
            <Input id="password" name="password" type="password" required placeholder="••••••••" />
          </div>
          <Button type="submit" className="w-full font-bold">
            Create Account
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-accent-gold hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
