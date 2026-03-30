"use client";

import { useTransition, Suspense } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { signUp } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Field, FieldLabel, FieldControl, FieldError } from "@/components/ui/field";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { AuthDivider } from "@/components/auth/AuthDivider";
import { AuthPasswordField } from "@/components/auth/AuthPasswordField";

const PANEL_BG = "bg-white dark:bg-zinc-900";

const authField =
  "h-12 rounded-xl border-0 bg-muted/65 px-4 text-[15px] shadow-none ring-1 ring-black/[0.06] transition-[background-color,box-shadow] placeholder:text-muted-foreground/70 focus-visible:bg-muted/85 focus-visible:ring-2 focus-visible:ring-primary/35 dark:bg-muted/40 dark:ring-white/10";

const labelClass = "text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground";

const schema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type SignupSchema = z.infer<typeof schema>;

function SignupForm() {
  const [isPending, startTransition] = useTransition();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next")?.trim() ?? "";

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
    if (nextPath.startsWith("/") && !nextPath.startsWith("//")) {
      fd.set("next", nextPath);
    }
    startTransition(async () => {
      const result = await signUp(fd);
      if (result?.error) form.setError("root", { message: result.error });
    });
  };

  const loginHref = nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login";

  return (
    <AuthSplitLayout
      heroTitle="Join the marketplace."
      heroSubtitle="Create an account to shop vendors, track orders, and list your own storefront when you’re ready."
      title="Create account"
      description="Start with email or Google—we’ll send a quick link to confirm your address."
      footer={
        <>
          Already have an account?{" "}
          <Link href={loginHref} className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <div className="space-y-6">
        {rootError && (
          <Alert variant="destructive" className="rounded-xl border-destructive/25 text-sm shadow-none">
            {rootError}
          </Alert>
        )}

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Field error={form.formState.errors.full_name?.message}>
            <FieldLabel required className={labelClass}>
              Full name
            </FieldLabel>
            <FieldControl>
              <Input
                placeholder="Enter your name"
                autoComplete="name"
                className={authField}
                {...form.register("full_name")}
              />
            </FieldControl>
            <FieldError />
          </Field>

          <Field error={form.formState.errors.email?.message}>
            <FieldLabel required className={labelClass}>
              Email address
            </FieldLabel>
            <FieldControl>
              <Input
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                className={authField}
                {...form.register("email")}
              />
            </FieldControl>
            <FieldError />
          </Field>

          <AuthPasswordField
            label="Password"
            labelClassName={labelClass}
            fieldClassName={authField}
            registration={form.register("password")}
            error={form.formState.errors.password?.message}
            placeholder="At least 8 characters"
            autoComplete="new-password"
            description="Must be at least 8 characters long."
          />

          <Button
            type="submit"
            disabled={isPending}
            className="mt-2 h-12 w-full gap-2 rounded-full text-base font-medium shadow-lg shadow-primary/25"
          >
            {isPending ? "Creating account…" : "Create account"}
            {!isPending ? <ArrowRight className="h-4 w-4" aria-hidden /> : null}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          <Link href="/explore" className="font-medium text-foreground/80 underline-offset-4 hover:text-foreground hover:underline">
            Continue without signing in
          </Link>
        </p>

        <AuthDivider panelClassName={PANEL_BG} />

        <GoogleSignInButton nextPath={nextPath || undefined} />
      </div>
    </AuthSplitLayout>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={<div className="min-h-svh bg-[#f0f1f3] dark:bg-zinc-950" aria-busy="true" aria-label="Loading" />}
    >
      <SignupForm />
    </Suspense>
  );
}
