import Link from "next/link";
import { Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export type FooterProps = {
  /** Home link for the wordmark (marketing uses `/`, marketplace uses `/explore`). */
  brandHref?: string;
};

const sections = [
  {
    title: "Marketplace",
    links: [
      { href: "/explore", label: "Explore" },
      { href: "/products", label: "All products" },
      { href: "/shops", label: "Shops" },
      { href: "/search", label: "Search" },
    ],
  },
  {
    title: "Your account",
    links: [
      { href: "/login", label: "Sign in" },
      { href: "/signup", label: "Create account" },
      { href: "/orders", label: "Orders" },
      { href: "/profile", label: "Profile" },
      { href: "/notifications", label: "Notifications" },
    ],
  },
  {
    title: "For vendors",
    links: [
      { href: "/vendor", label: "Vendor hub" },
      { href: "/vendor/onboarding", label: "Open a shop" },
    ],
  },
] as const;

export function Footer({ brandHref = "/explore" }: FooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-auto border-t border-border/70 bg-gradient-to-b from-background via-muted/20 to-muted/40">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-primary/[0.07] to-transparent"
        aria-hidden
      />
      <div className="relative h-1 bg-gradient-to-r from-primary/90 via-primary/50 to-primary/15" aria-hidden />

      <div className="relative container mx-auto px-4 py-12 md:py-14 lg:px-6">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-4 space-y-5">
            <Link
              href={brandHref}
              className="inline-flex items-center gap-2 rounded-lg text-lg font-bold tracking-tight text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                <Store className="h-4 w-4" aria-hidden />
              </span>
              Moxxa Mart
            </Link>
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              A multi-vendor marketplace for curated products from independent shops. Browse, compare, and support local
              sellers in one place.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" className="h-10 min-h-10 font-semibold shadow-sm" asChild>
                <Link href="/explore">Start shopping</Link>
              </Button>
              <Button size="sm" variant="outline" className="h-10 min-h-10 font-semibold border-primary/25" asChild>
                <Link href="/vendor/onboarding">Open a shop</Link>
              </Button>
            </div>
          </div>

          <nav
            className="grid grid-cols-2 gap-10 sm:grid-cols-3 lg:col-span-8 lg:justify-end"
            aria-label="Footer"
          >
            {sections.map((section) => (
              <div key={section.title}>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary mb-4">{section.title}</p>
                <ul className="space-y-2.5">
                  {section.links.map(({ href, label }) => (
                    <li key={href}>
                      <Link
                        href={href}
                        className="group inline-flex text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <span className="border-b border-transparent pb-px transition-colors group-hover:border-primary/50 group-hover:text-primary">
                          {label}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <Separator className="my-10 bg-border/60" />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground sm:text-sm">
            © {year} Moxxa Mart. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground sm:text-sm">
            <Link href="/explore" className="transition-colors hover:text-primary">
              Marketplace
            </Link>
            <span className="hidden h-3 w-px bg-border sm:inline" aria-hidden />
            <Link href="/vendor/onboarding" className="transition-colors hover:text-primary">
              Sell with us
            </Link>
            <span className="hidden h-3 w-px bg-border sm:inline" aria-hidden />
            <Link href="/login" className="transition-colors hover:text-primary">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
