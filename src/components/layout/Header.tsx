"use client";

import { useState } from "react";
import Link from "next/link";
import { ShoppingCart, Store, User, LogOut, LayoutDashboard, Shield, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SearchBar } from "./SearchBar";
import { CartDrawer } from "./CartDrawer";
import { useCartContext } from "@/context/CartContext";
import { signOut } from "@/actions/auth";

type Profile = {
  full_name?: string | null;
  avatar_url?: string | null;
  role?: string | null;
} | null;

export function Header({ profile }: { profile: Profile }) {
  const [cartOpen, setCartOpen] = useState(false);
  const { itemCount } = useCartContext();

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center gap-4 px-4">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl shrink-0">
            <Store className="h-6 w-6 text-primary" />
            <span>Moxxa</span>
          </Link>

          <div className="flex-1">
            <SearchBar />
          </div>

          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link href="/shops"><Building className="mr-2 h-4 w-4" />Shops</Link>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => setCartOpen(true)}
              aria-label="Open cart"
            >
              <ShoppingCart className="h-5 w-5" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-xs text-primary-foreground flex items-center justify-center font-medium">
                  {itemCount > 99 ? "99+" : itemCount}
                </span>
              )}
            </Button>

            {profile ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={profile.avatar_url ?? undefined} />
                      <AvatarFallback>{profile.full_name?.[0] ?? "U"}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{profile.full_name ?? "User"}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/orders"><User className="mr-2 h-4 w-4" />My Orders</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/vendor"><LayoutDashboard className="mr-2 h-4 w-4" />Vendor Hub</Link>
                  </DropdownMenuItem>
                  {profile.role === "admin" && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin"><Shield className="mr-2 h-4 w-4" />Admin</Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <form action={signOut} className="w-full">
                      <button type="submit" className="flex w-full items-center text-destructive">
                        <LogOut className="mr-2 h-4 w-4" />Sign Out
                      </button>
                    </form>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild variant="default" size="sm">
                <Link href="/login">Sign In</Link>
              </Button>
            )}
          </div>
        </div>
      </header>
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}
