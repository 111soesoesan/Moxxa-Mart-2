"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { signIn } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Field, FieldLabel, FieldControl, FieldError } from "@/components/ui/field";
import { Store } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginSchema = z.infer<typeof schema>;

function LoginForm() {
  const [isPending, startTransition] = useTransition();
  const searchParams = useSearchParams();
  const authError = searchParams.get("error");

  const form = useForm<LoginSchema>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const rootError = form.formState.errors.root?.message;

  const onSubmit = (values: LoginSchema) => {
    const fd = new FormData();
    fd.set("email", values.email);
    fd.set("password", values.password);
    startTransition(async () => {
      const result = await signIn(fd);
      if (result?.error) form.setError("root", { message: result.error });
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <Link href="/" className="flex items-center justify-center gap-2 mb-4">
            <Store className="h-7 w-7 text-primary" />
            <span className="font-bold text-xl">Moxxa Mart</span>
          </Link>
          <CardTitle>Welcome back</CardTitle>
          <CardDescription>Sign in to your account</CardDescription>
        </CardHeader>
        <CardContent>
          {(rootError || authError) && (
            <Alert variant="destructive" className="mb-4 text-sm">
              {rootError ?? "Authentication failed. Please try again."}
            </Alert>
          )}
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Field error={form.formState.errors.email?.message}>
              <FieldLabel required>Email</FieldLabel>
              <FieldControl>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  {...form.register("email")}
                />
              </FieldControl>
              <FieldError />
            </Field>

            <Field error={form.formState.errors.password?.message}>
              <FieldLabel required>Password</FieldLabel>
              <FieldControl>
                <Input
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  {...form.register("password")}
                />
              </FieldControl>
              <FieldError />
            </Field>

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Signing in…" : "Sign In"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-primary font-medium ml-1 hover:underline">
            Sign up
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
