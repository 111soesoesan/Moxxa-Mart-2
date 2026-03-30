"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useCustomerFloatingUi } from "@/context/CustomerFloatingUiContext";

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

/**
 * Sentinel sits in flow directly above the sticky shop nav.
 * Stuck = sentinel’s top has crossed above the measured main-header band (same px as `top` on the sticky nav),
 * and we’re not in the “sentinel still below the viewport” case.
 */
export function ShopSecondaryNav({ shopSlug }: ShopSecondaryNavProps) {
  const pathname = usePathname() || "";
  const base = `/shop/${shopSlug}`;
  const sentinelRef = useRef<HTMLDivElement>(null);
  const limitRef = useRef(72);
  const floating = useCustomerFloatingUi();
  const setShopNavStuck = floating?.setShopNavStuck;
  const mainHeaderStickyTopPx = floating?.mainHeaderStickyTopPx ?? 72;
  const shopNavStuck = floating?.shopNavStuck ?? false;
  const mainNavElevated = floating?.mainNavElevated ?? false;
  const merged = mainNavElevated && shopNavStuck;

  limitRef.current = mainHeaderStickyTopPx;

  useEffect(() => {
    const el = sentinelRef.current;
    const setStuck = setShopNavStuck;
    if (!el || !setStuck) return;

    const tick = () => {
      const lim = limitRef.current;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      if (r.top > vh) {
        setStuck(false);
        return;
      }
      setStuck(r.top < lim - 0.5);
    };

    const io = new IntersectionObserver(tick, {
      root: null,
      rootMargin: "0px",
      threshold: [0, 0.01, 0.5, 1],
    });

    io.observe(el);
    tick();
    window.addEventListener("scroll", tick, { passive: true });
    window.addEventListener("resize", tick, { passive: true });

    return () => {
      io.disconnect();
      window.removeEventListener("scroll", tick);
      window.removeEventListener("resize", tick);
      setStuck(false);
    };
  }, [setShopNavStuck, mainHeaderStickyTopPx]);

  return (
    <>
      <div ref={sentinelRef} className="pointer-events-none h-px w-full shrink-0" aria-hidden />
      <div
        className="sticky z-40 w-full bg-transparent"
        style={{ top: mainHeaderStickyTopPx }}
      >
        <div
          className={cn(
            "mx-auto w-full max-w-7xl px-3 pb-2 sm:px-4 sm:pb-3",
            merged ? "pt-0" : "pt-1 sm:pt-2"
          )}
        >
          <nav
            className={cn(
              "scrollbar-hide flex items-center gap-0.5 overflow-x-auto px-1 py-1 transition-[background,box-shadow,backdrop-filter,border-radius] duration-200 md:px-2 md:py-1.5",
              shopNavStuck
                ? merged
                  ? cn(
                      "-mt-px rounded-t-none rounded-b-2xl shadow-md backdrop-blur-md",
                      "bg-background/95 supports-[backdrop-filter]:bg-background/80 dark:shadow-black/15"
                    )
                  : cn(
                      "rounded-2xl shadow-md backdrop-blur-md",
                      "bg-background/90 supports-[backdrop-filter]:bg-background/75 dark:shadow-black/15"
                    )
                : "rounded-none bg-transparent shadow-none backdrop-blur-none"
            )}
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
    </>
  );
}
