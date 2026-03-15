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
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border/50 bg-white px-6 dark:bg-slate-950">
          <SidebarTrigger className="-ml-2" />
          <Separator orientation="vertical" className="my-2"/>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">{title}</h1>
        </header>

        {/* ── Page content ── */}
        <div className="flex flex-1 flex-col gap-0 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
