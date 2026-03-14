"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { signUp } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Field, FieldLabel, FieldControl, FieldError, FieldDescription } from "@/components/ui/field";
import { Store } from "lucide-react";

const schema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type SignupSchema = z.infer<typeof schema>;

export default function SignupPage() {
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const form = useForm<SignupSchema>({
    resolver: zodResolver(schema),
    defaultValues: { full_name: "", email: "", password: "" },
  });

  const rootError = form.formState.errors.root?.message;

  const onSubmit = (values: SignupSchema) => {
    const fd = new FormData();
    fd.set("full_name", values.full_name);
    fd.set("email", values.email);
    fd.set("password", values.password);
    startTransition(async () => {
      const result = await signUp(fd);
      if (result?.error) form.setError("root", { message: result.error });
      else if (result?.success) setSuccess(result.success);
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
          <CardTitle>Create an account</CardTitle>
          <CardDescription>Start shopping or selling today</CardDescription>
        </CardHeader>
        <CardContent>
          {rootError && (
            <Alert variant="destructive" className="mb-4 text-sm">{rootError}</Alert>
          )}
          {success ? (
            <Alert className="text-sm">{success}</Alert>
          ) : (
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <Field error={form.formState.errors.full_name?.message}>
                <FieldLabel required>Full Name</FieldLabel>
                <FieldControl>
                  <Input
                    placeholder="Juan dela Cruz"
                    autoComplete="name"
                    {...form.register("full_name")}
                  />
                </FieldControl>
                <FieldError />
              </Field>

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
                    placeholder="Min. 8 characters"
                    autoComplete="new-password"
                    {...form.register("password")}
                  />
                </FieldControl>
                <FieldDescription>At least 8 characters</FieldDescription>
                <FieldError />
              </Field>

              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? "Creating account…" : "Create Account"}
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="justify-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-primary font-medium ml-1 hover:underline">
            Sign in
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
