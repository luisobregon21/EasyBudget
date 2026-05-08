"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";

const schema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

type FormData = z.infer<typeof schema>;
type Stage = "idle" | "loading" | "success" | "error";

export function LoginForm() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    setStage("loading");
    setErrorMessage(null);

    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    if (result?.error) {
      setStage("error");
      setErrorMessage("Invalid email or password. Please try again.");
      return;
    }

    setStage("success");
    setTimeout(() => {
      router.push("/");
      router.refresh();
    }, 800);
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Welcome back to EasyBudget</CardDescription>
      </CardHeader>
      <CardContent>
        {stage === "success" ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle className="h-10 w-10 text-green-500" />
            <p className="font-semibold text-green-700">Signed in!</p>
            <p className="text-sm text-muted-foreground">Taking you to your dashboard…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                disabled={stage === "loading"}
                {...register("email")}
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                disabled={stage === "loading"}
                {...register("password")}
              />
              {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
            </div>

            {stage === "error" && errorMessage && (
              <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                {errorMessage}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={stage === "loading"}>
              {stage === "loading"
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Signing in…</>
                : "Sign in"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="underline hover:text-foreground">
                Register
              </Link>
            </p>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
