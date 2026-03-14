"use client";

import { usePathname } from "next/navigation";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { AppSidebar, type SidebarShop, type SidebarProfile } from "./AppSidebar";

const PAGE_TITLES: Record<string, string> = {
  products: "Products",
  orders:   "Orders",
  billing:  "Billing",
  settings: "Settings",
};

function getPageTitle(pathname: string, shopSlug: string): string {
  const base = `/vendor/${shopSlug}`;
  const after = pathname.slice(base.length).replace(/^\//, "");
  const segment = after.split("/")[0];

  if (!segment) return "Dashboard";
  if (segment === "products") {
    if (after.includes("/edit")) return "Edit Product";
    if (after.endsWith("/new"))  return "Add Product";
    return "Products";
  }
  return PAGE_TITLES[segment] ?? "Dashboard";
}

type Props = {
  shops: SidebarShop[];
  currentShop: SidebarShop;
  profile: SidebarProfile;
  children: React.ReactNode;
};

export function DashboardShell({ shops, currentShop, profile, children }: Props) {
  const pathname = usePathname();
  const title = getPageTitle(pathname, currentShop.slug);

  return (
    <SidebarProvider>
      <AppSidebar shops={shops} currentShop={currentShop} profile={profile} />

      <SidebarInset>
        {/* ── Top header ── */}
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="my-2"/>
          <h1 className="text-sm font-semibold">{title}</h1>
        </header>

        {/* ── Page content ── */}
        <div className="flex flex-1 flex-col gap-4 bg-muted/20">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
