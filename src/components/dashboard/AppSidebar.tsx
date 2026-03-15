"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  CreditCard,
  Banknote,
  Settings,
  Plus,
  Store,
  LogOut,
  ExternalLink,
  ChevronsUpDown,
} from "lucide-react";
import { signOut } from "@/actions/auth";

export type SidebarShop = {
  id: string;
  name: string;
  slug: string;
  status: string;
  logo_url: string | null;
};

export type SidebarProfile = {
  full_name?: string | null;
  avatar_url?: string | null;
  role?: string | null;
  email?: string | null;
};

type Props = {
  shops: SidebarShop[];
  currentShop: SidebarShop;
  profile: SidebarProfile;
};

const NAV_ITEMS = [
  { segment: null, label: "Dashboard", icon: LayoutDashboard, exact: true },
  { segment: "products", label: "Products", icon: Package, exact: false },
  { segment: "orders", label: "Orders", icon: ShoppingBag, exact: false },
  { segment: "payment-methods", label: "Payment Methods", icon: Banknote, exact: false },
  { segment: "billing", label: "Billing", icon: CreditCard, exact: false },
  { segment: "settings", label: "Settings", icon: Settings, exact: false },
] as const;

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500",
  draft: "bg-yellow-400",
  pending_review: "bg-blue-500",
  rejected: "bg-red-500",
  suspended: "bg-red-500",
};

export function AppSidebar({ shops, currentShop, profile }: Props) {
  const pathname = usePathname();
  const base = `/vendor/${currentShop.slug}`;
  const displayName = profile.full_name ?? profile.email ?? "User";

  const isActive = (segment: string | null, exact?: boolean) => {
    const href = segment ? `${base}/${segment}` : base;
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50">
      {/* ── Workspace switcher ── */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg shrink-0">
                    <AvatarImage src={currentShop.logo_url ?? undefined} />
                    <AvatarFallback className="rounded-lg text-xs font-semibold">
                      {currentShop.name[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{currentShop.name}</span>
                    <span className="flex items-center gap-1 truncate text-xs text-sidebar-foreground/70">
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full shrink-0",
                          STATUS_COLORS[currentShop.status] ?? "bg-muted-foreground"
                        )}
                      />
                      {currentShop.status.replace("_", " ")}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4 shrink-0" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                align="start"
                side="bottom"
                sideOffset={4}
              >
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                  Your Shops
                </div>
                {shops.map((shop) => (
                  <DropdownMenuItem key={shop.id} asChild>
                    <Link href={`/vendor/${shop.slug}`} className="flex items-center gap-2">
                      <Avatar className="h-6 w-6 rounded-md shrink-0">
                        <AvatarImage src={shop.logo_url ?? undefined} />
                        <AvatarFallback className="rounded-md text-xs">
                          {shop.name[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="flex-1 truncate">{shop.name}</span>
                      {shop.slug === currentShop.slug && (
                        <span className="text-xs text-primary font-medium">✓</span>
                      )}
                    </Link>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/vendor/onboarding">
                    <Plus className="mr-2 h-4 w-4" />
                    Create new shop
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* ── Navigation ── */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map(({ segment, label, icon: Icon, exact }) => (
                <SidebarMenuItem key={label}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(segment, exact)}
                    tooltip={label}
                  >
                    <Link href={segment ? `${base}/${segment}` : base}>
                      <Icon />
                      <span>{label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {currentShop.status === "active" && (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="View Public Shop">
                    <Link
                      href={`/shop/${currentShop.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink />
                      <span>View Public Shop</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* ── User profile ── */}
      <SidebarFooter>
        <SidebarSeparator />
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg shrink-0">
                    <AvatarImage src={profile.avatar_url ?? undefined} />
                    <AvatarFallback className="rounded-lg text-xs">
                      {displayName[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{displayName}</span>
                    {profile.email && (
                      <span className="truncate text-xs text-sidebar-foreground/70">
                        {profile.email}
                      </span>
                    )}
                  </div>
                  <ChevronsUpDown className="ml-auto size-4 shrink-0" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-52 rounded-lg"
                side="top"
                align="end"
                sideOffset={4}
              >
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium truncate">{displayName}</p>
                  {profile.email && profile.full_name && (
                    <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
                  )}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/vendor">
                    <Store className="mr-2 h-4 w-4" />All Shops
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/orders">
                    <ShoppingBag className="mr-2 h-4 w-4" />My Orders
                  </Link>
                </DropdownMenuItem>
                {profile.role === "admin" && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/admin">Admin Panel</Link>
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
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
