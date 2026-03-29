"use client";

import Link from "next/link";
import { Store, LogOut, LayoutDashboard, User, Shield } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/actions/auth";

type Profile = {
  full_name?: string | null;
  avatar_url?: string | null;
  role?: string | null;
  email?: string | null;
};

export function HubHeader({ profile }: { profile: Profile }) {
  const displayName = profile.full_name ?? profile.email ?? "User";

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center justify-between gap-4 px-4">
        <Link href="/explore" className="flex items-center gap-2 font-semibold text-sm">
          <Store className="h-5 w-5 text-primary" />
          Moxxa Mart
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full h-8 w-8">
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile.avatar_url ?? undefined} />
                <AvatarFallback className="text-xs">
                  {displayName[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium truncate">{displayName}</p>
              {profile.email && profile.full_name && (
                <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
              )}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/vendor">
                <LayoutDashboard className="mr-2 h-4 w-4" />Vendor Hub
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/orders">
                <User className="mr-2 h-4 w-4" />My Orders
              </Link>
            </DropdownMenuItem>
            {profile.role === "admin" && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/admin">
                    <Shield className="mr-2 h-4 w-4" />Admin Panel
                  </Link>
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <form action={signOut} className="w-full">
                <button type="submit" className="flex w-full items-center text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />Sign out
                </button>
              </form>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
