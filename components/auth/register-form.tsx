"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { registerUser } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type FormData = z.infer<typeof schema>;
type Stage = "idle" | "registering" | "signing-in" | "success" | "error";

export function RegisterForm() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    setStage("registering");
    setErrorMessage(null);

    try {
      await registerUser(data);
    } catch (err) {
      setStage("error");
      setErrorMessage(err instanceof Error ? err.message : "Registration failed. Please try again.");
      return;
    }

    setStage("signing-in");

    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    if (result?.error) {
      setStage("error");
      setErrorMessage("Account created but sign-in failed. Please go to the login page.");
      return;
    }

    setStage("success");
    setTimeout(() => {
      router.push("/");
      router.refresh();
    }, 1200);
  }

  const isSubmitting = stage === "registering" || stage === "signing-in";

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Create account</CardTitle>
        <CardDescription>Start tracking your budget</CardDescription>
      </CardHeader>
      <CardContent>
        {stage === "success" ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle className="h-10 w-10 text-green-500" />
            <p className="font-semibold text-green-700">Account created!</p>
            <p className="text-sm text-muted-foreground">Taking you to your dashboard…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" type="text" autoComplete="name" disabled={isSubmitting} {...register("name")} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" disabled={isSubmitting} {...register("email")} />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="new-password" disabled={isSubmitting} {...register("password")} />
              {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
            </div>

            {stage === "error" && errorMessage && (
              <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                {errorMessage}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {stage === "registering" && <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating account…</>}
              {stage === "signing-in" && <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Signing you in…</>}
              {(stage === "idle" || stage === "error") && "Create account"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="underline hover:text-foreground">
                Sign in
              </Link>
            </p>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
