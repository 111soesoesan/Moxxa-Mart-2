"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
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
  Newspaper,
  Users,
  BarChart3,
  ChevronRight,
  List,
  Tag,
  FolderTree,
  MessageSquare,
} from "lucide-react";
import { Collapsible } from "radix-ui";
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

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500",
  draft: "bg-yellow-400",
  pending_review: "bg-blue-500",
  rejected: "bg-red-500",
  suspended: "bg-red-500",
};

const PRODUCTS_SUBITEMS = [
  { segment: "products", label: "All Products", icon: List, exact: true },
  { segment: "products/new", label: "Add New Product", icon: Plus, exact: false },
  { segment: "products/attributes", label: "Attributes", icon: Tag, exact: false },
  { segment: "products/categories", label: "Categories", icon: FolderTree, exact: false },
] as const;

const OTHER_NAV_ITEMS = [
  { segment: "orders", label: "Orders", icon: ShoppingBag },
  { segment: "inventory", label: "Inventory", icon: BarChart3 },
  { segment: "customers", label: "Customers", icon: Users },
  { segment: "messages", label: "Messages", icon: MessageSquare },
  { segment: "blogs", label: "Blogs", icon: Newspaper },
  { segment: "payment-methods", label: "Payment Methods", icon: Banknote },
  { segment: "billing", label: "Billing", icon: CreditCard },
  { segment: "settings", label: "Settings", icon: Settings },
] as const;

export function AppSidebar({ shops, currentShop, profile }: Props) {
  const pathname = usePathname();
  const base = `/vendor/${currentShop.slug}`;
  const displayName = profile.full_name ?? profile.email ?? "User";

  const isActive = (segment: string, exact = false) => {
    const href = `${base}/${segment}`;
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const isDashboardActive = pathname === base;

  const isProductsActive = PRODUCTS_SUBITEMS.some((item) =>
    isActive(item.segment, item.exact)
  );

  const [productsOpen, setProductsOpen] = useState(isProductsActive);

  useEffect(() => {
    if (isProductsActive) setProductsOpen(true);
  }, [isProductsActive]);

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
                    <Plus className="mr-2 h-4 w-4" />Create new shop
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
              {/* Dashboard */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isDashboardActive} tooltip="Dashboard">
                  <Link href={base}>
                    <LayoutDashboard />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Products — collapsible submenu */}
              <Collapsible.Root
                open={productsOpen}
                onOpenChange={setProductsOpen}
                className="group/products"
              >
                <SidebarMenuItem>
                  <Collapsible.Trigger asChild>
                    <SidebarMenuButton
                      isActive={isProductsActive}
                      tooltip="Products"
                      className="w-full"
                    >
                      <Package />
                      <span>Products</span>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/products:rotate-90" />
                    </SidebarMenuButton>
                  </Collapsible.Trigger>
                  <Collapsible.Content>
                    <SidebarMenuSub>
                      {PRODUCTS_SUBITEMS.map((item) => (
                        <SidebarMenuSubItem key={item.segment}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={isActive(item.segment, item.exact)}
                          >
                            <Link href={`${base}/${item.segment}`}>
                              <item.icon className="h-3.5 w-3.5" />
                              <span>{item.label}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </Collapsible.Content>
                </SidebarMenuItem>
              </Collapsible.Root>

              {/* Other nav items */}
              {OTHER_NAV_ITEMS.map((item) => {
                const href = `${base}/${item.segment}`;
                const active = pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <SidebarMenuItem key={item.segment}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                      <Link href={href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
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
