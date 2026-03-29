"use client";

import { useState } from "react";
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
  const exploreActive = href === "/explore" && active;
  return (
    <Link
      href={href}
      className={cn(
        "text-sm transition-colors hover:text-foreground",
        exploreActive && "font-bold text-primary border-b-2 border-primary pb-0.5 -mb-0.5",
        !exploreActive && active && "font-medium text-foreground",
        !active && "font-medium text-muted-foreground"
      )}
    >
      {children}
    </Link>
  );
}

export function Header({ profile }: { profile: Profile }) {
  const pathname = usePathname() || "";
  const [cartOpen, setCartOpen] = useState(false);
  const { itemCount } = useCartContext();

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-14 md:h-16 items-center justify-between px-3 md:px-4">
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
              className="hidden md:inline-flex relative rounded-full"
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

            <Button variant="ghost" size="icon" className="relative rounded-full" asChild aria-label="Notifications">
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
      </header>
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}
