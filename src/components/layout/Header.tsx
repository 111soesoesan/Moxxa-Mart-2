"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ShoppingCart,
  Store,
  User,
  LogOut,
  LayoutDashboard,
  Shield,
  Package,
  Bell,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CartDrawer } from "./CartDrawer";
import { useCartContext } from "@/context/CartContext";
import { signOut } from "@/actions/auth";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { useCustomerFloatingUi } from "@/context/CustomerFloatingUiContext";

type Profile = {
  full_name?: string | null;
  avatar_url?: string | null;
  role?: string | null;
} | null;

function NavLink({
  href,
  pathname,
  children,
}: {
  href: string;
  pathname: string;
  children: React.ReactNode;
}) {
  const active =
    href === "/explore"
      ? pathname === "/explore"
      : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      className={cn(
        "text-sm transition-all relative pb-1.5 hover:text-foreground",
        active && "font-bold text-primary",
        !active && "font-medium text-muted-foreground"
      )}
    >
      {children}
      {active && (
        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
      )}
    </Link>
  );
}

export function Header({ profile }: { profile: Profile }) {
  const pathname = usePathname() || "";
  const [cartOpen, setCartOpen] = useState(false);
  const { itemCount } = useCartContext();
  const isOrdersActive = pathname === "/orders" || pathname.startsWith("/orders/");
  const isNotificationsActive = pathname === "/notifications" || pathname.startsWith("/notifications/");
  const headerRef = useRef<HTMLElement | null>(null);
  const floating = useCustomerFloatingUi();
  const reportMainHeaderHeight = floating?.reportMainHeaderHeight;
  const mainNavElevated = floating?.mainNavElevated ?? false;
  const shopNavStuck = floating?.shopNavStuck ?? false;
  const isShopRoute = pathname.startsWith("/shop/");
  const mergeWithShopNav = isShopRoute && mainNavElevated && shopNavStuck;

  useLayoutEffect(() => {
    const el = headerRef.current;
    if (!el || !reportMainHeaderHeight) return;
    const measure = () => reportMainHeaderHeight(el.getBoundingClientRect().height);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure, { passive: true });
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [reportMainHeaderHeight]);

  return (
    <>
      <header ref={headerRef} className="sticky top-0 z-50 w-full bg-transparent">
        <div className="mx-auto w-full max-w-7xl px-3 pt-2 sm:px-4 sm:pt-3">
          <div
            className={cn(
              "flex h-14 items-center justify-between gap-2 px-3 backdrop-blur-md transition-all duration-300 md:h-16 md:px-5",
              mergeWithShopNav ? "rounded-t-2xl rounded-b-none" : "rounded-2xl",
              mainNavElevated
                ? mergeWithShopNav
                  ? "bg-background/95 shadow-none dark:shadow-none"
                  : "bg-background/95 shadow-md md:shadow-lg dark:shadow-black/20"
                : "bg-background/40 shadow-none",
              mergeWithShopNav && "border-b border-border/15",
              "supports-[backdrop-filter]:bg-background/75"
            )}
          >
          <div className="flex items-center gap-4">
            {/* Unified Logo */}
            <Link
              href="/explore"
              className="flex items-center gap-1.5 md:gap-2 font-bold text-lg md:text-xl shrink-0"
            >
              <Store className="h-5 w-5 md:h-6 md:w-6 text-primary" />
              <span className="tracking-tight font-black">Moxxa Mart</span>
            </Link>

            {/* Desktop primary nav */}
            <nav className="hidden lg:flex items-center gap-6 shrink-0 ml-4">
              <NavLink href="/explore" pathname={pathname}>
                Explore
              </NavLink>
              <NavLink href="/products" pathname={pathname}>
                Products
              </NavLink>
              <NavLink href="/shops" pathname={pathname}>
                Shops
              </NavLink>
            </nav>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 shrink-0">
            <Button
              variant="default"
              size="icon"
              className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
              asChild
              aria-label="Search"
            >
              <Link href="/search">
                <Search className="h-4 w-4 md:h-5 md:w-5" />
              </Link>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "hidden md:inline-flex relative rounded-full transition-colors",
                isOrdersActive && "bg-primary/10 text-primary hover:bg-primary/20"
              )}
              asChild
              aria-label="Orders"
            >
              <Link href="/orders">
                <Package className="h-5 w-5" />
              </Link>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="relative rounded-full"
              onClick={() => setCartOpen(true)}
              aria-label="Open cart"
            >
              <ShoppingCart className="h-5 w-5" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center font-bold">
                  {itemCount > 99 ? "99+" : itemCount}
                </span>
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "relative rounded-full transition-colors",
                isNotificationsActive && "bg-primary/10 text-primary hover:bg-primary/20"
              )}
              asChild
              aria-label="Notifications"
            >
              <Link href="/notifications">
                <Bell className="h-5 w-5" />
              </Link>
            </Button>

            <div className="flex items-center">
              {profile ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full ml-1">
                      <Avatar className="h-8 w-8 hover:ring-2 hover:ring-primary/20 transition-all">
                        <AvatarImage src={profile.avatar_url ?? undefined} />
                        <AvatarFallback>{profile.full_name?.[0] ?? "U"}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <div className="px-2 py-1.5">
                      <p className="text-sm font-medium">{profile.full_name ?? "User"}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/profile">
                        <User className="mr-2 h-4 w-4" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/vendor">
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        Vendor Hub
                      </Link>
                    </DropdownMenuItem>
                    {profile.role === "admin" && (
                      <DropdownMenuItem asChild>
                        <Link href="/admin">
                          <Shield className="mr-2 h-4 w-4" />
                          Admin
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <form action={signOut} className="w-full">
                        <button type="submit" className="flex w-full items-center text-destructive">
                          <LogOut className="mr-2 h-4 w-4" />
                          Sign out
                        </button>
                      </form>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="hidden md:block ml-2">
                  <Button asChild variant="default" size="sm" className="rounded-full px-4">
                    <Link href="/login">Sign in</Link>
                  </Button>
                </div>
              )}
              {!profile && (
                 <Button variant="ghost" size="icon" className="md:hidden rounded-full" asChild aria-label="Sign in">
                   <Link href="/login">
                     <User className="h-5 w-5" />
                   </Link>
                 </Button>
              )}
            </div>
          </div>
        </div>
        </div>
      </header>
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}
