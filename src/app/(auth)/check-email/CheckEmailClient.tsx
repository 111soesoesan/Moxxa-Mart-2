"use client";

import { useTransition, useState } from "react";
import Link from "next/link";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { Button } from "@/components/ui/button";
import { resendSignupEmail } from "@/actions/auth";

export function CheckEmailClient({
  email,
  nextPath,
}: {
  email: string;
  nextPath?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loginHref = nextPath
    ? `/login?next=${encodeURIComponent(nextPath)}`
    : "/login";

  const onResend = () => {
    setMessage(null);
    setError(null);
    const fd = new FormData();
    fd.set("email", email);
    startTransition(async () => {
      const result = await resendSignupEmail(fd);
      if (result?.error) setError(result.error);
      else if (result?.ok) setMessage("We sent another confirmation link.");
    });
  };

  return (
    <AuthSplitLayout
      heroTitle="Almost there."
      heroSubtitle="Confirm your email and you’re in—same inbox you use for orders and receipts."
      title="Check your email"
      description={`We sent a confirmation link to ${email}. Open it on this device to finish creating your account.`}
      footer={
        <p>
          Wrong address?{" "}
          <Link href="/signup" className="font-semibold text-primary hover:underline">
            Start over
          </Link>
        </p>
      }
    >
      <div className="space-y-6">
        {message ? (
          <p className="text-sm text-muted-foreground" role="status">
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <Button
          className="h-12 w-full rounded-full text-base font-medium shadow-lg shadow-primary/25"
          asChild
        >
          <Link href={loginHref}>Back to sign in</Link>
        </Button>

        <Button
          type="button"
          variant="link"
          className="h-auto w-full p-0 text-sm font-semibold text-primary"
          disabled={isPending}
          onClick={onResend}
        >
          {isPending ? "Sending…" : "Resend confirmation email"}
        </Button>
      </div>
    </AuthSplitLayout>
  );
}
