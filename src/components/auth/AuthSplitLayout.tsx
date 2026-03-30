import Image from "next/image";
import Link from "next/link";
import { Store } from "lucide-react";
import { cn } from "@/lib/utils";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1606787366850-de6330128bfc?auto=format&fit=crop&w=1600&q=80";

export function AuthSplitLayout({
  heroTitle,
  heroSubtitle,
  title,
  description,
  children,
  footer,
  className,
}: {
  heroTitle: string;
  heroSubtitle: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-h-svh flex-col bg-[#f0f1f3] dark:bg-zinc-950", className)}>
      <header className="shrink-0 px-4 py-5 md:px-8">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
          <Link
            href="/explore"
            className="flex items-center gap-2 text-foreground transition-opacity hover:opacity-80"
          >
            <Store className="h-7 w-7 shrink-0 text-primary" aria-hidden />
            <span className="text-lg font-semibold tracking-tight">Moxxa Mart</span>
          </Link>
        </div>
      </header>

      <main className="flex flex-1 flex-col justify-center px-4 pb-8 pt-2 md:px-8 md:pb-12">
        <div
          className={cn(
            "mx-auto flex w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-white shadow-[0_24px_64px_-16px_rgba(0,0,0,0.12)] ring-1 ring-black/[0.06] dark:bg-zinc-900 dark:shadow-[0_24px_64px_-16px_rgba(0,0,0,0.45)] dark:ring-white/10",
            "md:min-h-[min(36rem,calc(100vh-8rem))] md:flex-row"
          )}
        >
          {/* Hero — mobile strip */}
          <div className="relative h-44 shrink-0 md:hidden">
            <Image
              src={HERO_IMAGE}
              alt=""
              fill
              className="object-cover"
              sizes="100vw"
              priority
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/10"
              aria-hidden
            />
            <div className="absolute inset-x-0 bottom-0 p-5 text-white">
              <p className="text-xl font-semibold tracking-tight">{heroTitle}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-white/88">{heroSubtitle}</p>
            </div>
          </div>

          {/* Hero — desktop left half */}
          <div className="relative hidden min-h-[20rem] w-full md:block md:w-1/2 md:min-h-0 md:flex-1">
            <Image
              src={HERO_IMAGE}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 768px) 0px, 50vw"
              priority
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/15"
              aria-hidden
            />
            <div className="absolute inset-x-0 bottom-0 p-8 lg:p-12 xl:p-14">
              <p className="text-3xl font-semibold tracking-tight text-white lg:text-4xl">{heroTitle}</p>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-white/90 lg:text-[0.9375rem]">
                {heroSubtitle}
              </p>
            </div>
          </div>

          {/* Form column */}
          <div className="flex w-full flex-col justify-center bg-white px-6 py-10 dark:bg-zinc-900 md:w-1/2 md:max-w-none md:flex-1 md:px-10 lg:px-14 lg:py-12">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
            {description ? (
              <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted-foreground">{description}</p>
            ) : null}
            <div className="mt-8">{children}</div>
            {footer ? <div className="mt-10 text-center text-sm text-muted-foreground">{footer}</div> : null}
          </div>
        </div>
      </main>

      <footer className="shrink-0 px-4 py-6 text-center text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground md:px-8">
        © {new Date().getFullYear()} Moxxa Mart
      </footer>
    </div>
  );
}
