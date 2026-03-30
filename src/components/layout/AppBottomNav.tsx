"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, Store, Package, User } from "lucide-react";
import { cn } from "@/lib/utils";

type Profile = {
  full_name?: string | null;
  avatar_url?: string | null;
  role?: string | null;
} | null;

function showNavForPath(pathname: string) {
  if (pathname.startsWith("/checkout")) return false;
  if (pathname.startsWith("/product/")) return false;
  if (pathname.startsWith("/vendor")) return false;
  if (pathname.startsWith("/admin")) return false;
  if (pathname.startsWith("/login") || pathname.startsWith("/signup")) return false;
  return true;
}

export function AppBottomNav({ profile }: { profile: Profile }) {
  const pathname = usePathname() || "";
  if (!showNavForPath(pathname)) return null;

  const profileHref = profile ? "/profile" : "/login";

  const items: {
    href: string;
    label: string;
    icon: typeof Home;
    active: boolean;
  }[] = [
    {
      href: "/explore",
      label: "Home",
      icon: Home,
      active: pathname === "/explore",
    },
    {
      href: "/products",
      label: "Browse",
      icon: LayoutGrid,
      active: pathname.startsWith("/products"),
    },
    {
      href: "/shops",
      label: "Shops",
      icon: Store,
      active: pathname.startsWith("/shops") || pathname.startsWith("/shop/"),
    },
    {
      href: "/orders",
      label: "Orders",
      icon: Package,
      active: pathname.startsWith("/orders"),
    },
    {
      href: profileHref,
      label: "Profile",
      icon: User,
      active: pathname.startsWith("/profile"),
    },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-[env(safe-area-inset-bottom,0px)]"
      aria-label="Main navigation"
    >
      <div className="flex items-stretch justify-around h-14 max-w-lg mx-auto px-1">
        {items.map(({ href, label, icon: Icon, active }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors",
              active ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className={cn("h-5 w-5", active && "stroke-[2.5]")} aria-hidden />
            <span>{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
