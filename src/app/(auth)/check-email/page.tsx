import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CheckEmailClient } from "./CheckEmailClient";

type Props = {
  searchParams: Promise<{ email?: string; next?: string }>;
};

async function CheckEmailGate({ searchParams }: Props) {
  const params = await searchParams;
  const raw = params.email?.trim();
  if (!raw) redirect("/signup");

  let email: string;
  try {
    email = decodeURIComponent(raw);
  } catch {
    email = raw;
  }

  const nextRaw = params.next?.trim();
  const next =
    nextRaw && nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "";

  return <CheckEmailClient email={email} nextPath={next || undefined} />;
}

export default function CheckEmailPage(props: Props) {
  return (
    <Suspense
      fallback={
        <div className="min-h-svh bg-[#f0f1f3] dark:bg-zinc-950" aria-busy="true" aria-label="Loading" />
      }
    >
      <CheckEmailGate {...props} />
    </Suspense>
  );
}
