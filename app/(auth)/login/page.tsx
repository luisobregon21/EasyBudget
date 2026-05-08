import { signIn } from "@/lib/auth/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-app flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="gradient-text text-3xl font-black tracking-widest">EASYBUDGET</h1>
          <p className="text-muted-foreground mt-2 text-sm">Sign in to your budget</p>
        </div>

        <form
          action={async (formData: FormData) => {
            "use server";
            await signIn("credentials", {
              email: formData.get("email"),
              password: formData.get("password"),
              redirectTo: "/",
            });
          }}
          className="space-y-4"
        >
          <div className="space-y-1">
            <Label htmlFor="email" className="text-xs uppercase tracking-wide">Email</Label>
            <Input id="email" name="email" type="email" required placeholder="you@example.com" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password" className="text-xs uppercase tracking-wide">Password</Label>
            <Input id="password" name="password" type="password" placeholder="••••••••" />
          </div>
          <Button type="submit" className="w-full font-bold">
            Sign In
          </Button>
        </form>

        <form action={async () => { "use server"; await signIn("google", { redirectTo: "/" }); }}>
          <Button variant="outline" className="w-full">
            Continue with Google
          </Button>
        </form>
      </div>
    </div>
  );
}
