"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface ShopSecondaryNavProps {
  shopSlug: string;
}

/** Mirrors main site header: text links + primary underline bar when active */
function ShopNavLink({
  href,
  pathname,
  exact,
  children,
}: {
  href: string;
  pathname: string;
  exact?: boolean;
  children: React.ReactNode;
}) {
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={cn(
        "relative shrink-0 px-3 py-2.5 text-sm transition-colors md:px-4",
        active ? "font-semibold text-primary" : "font-medium text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
      {active ? (
        <span
          className="absolute bottom-1 left-3 right-3 h-0.5 rounded-full bg-primary md:left-4 md:right-4"
          aria-hidden
        />
      ) : null}
    </Link>
  );
}

export function ShopSecondaryNav({ shopSlug }: ShopSecondaryNavProps) {
  const pathname = usePathname() || "";
  const base = `/shop/${shopSlug}`;

  return (
    <div className="sticky top-14 z-30 border-b border-border/70 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:top-16">
      <div className="container mx-auto px-4">
        <nav
          className="-mb-px flex items-center gap-0.5 overflow-x-auto pb-px scrollbar-none"
          aria-label="Shop sections"
        >
          <ShopNavLink href={base} pathname={pathname} exact>
            Home
          </ShopNavLink>
          <ShopNavLink href={`${base}/products`} pathname={pathname}>
            Products
          </ShopNavLink>
          <ShopNavLink href={`${base}/blogs`} pathname={pathname}>
            Blog
          </ShopNavLink>
          <ShopNavLink href={`${base}/about`} pathname={pathname}>
            About
          </ShopNavLink>
        </nav>
      </div>
    </div>
  );
}
