"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { AppSidebar, type SidebarShop, type SidebarProfile } from "./AppSidebar";

const SEGMENT_LABELS: Record<string, string> = {
  products: "Products",
  orders: "Orders",
  inventory: "Inventory",
  customers: "Customers",
  blogs: "Blogs",
  billing: "Billing",
  settings: "Settings",
  "payment-methods": "Payment Methods",
  pos: "POS Terminal",
  "ai-assistant": "AI Assistant",
};

type BreadcrumbEntry = { label: string; href?: string };

function getBreadcrumbs(pathname: string, shopSlug: string, shopName: string): BreadcrumbEntry[] {
  const base = `/vendor/${shopSlug}`;
  const after = pathname.slice(base.length).replace(/^\//, "");
  const parts = after.split("/").filter(Boolean);

  if (parts.length === 0) {
    return [{ label: shopName }];
  }

  const [section, sub, sub2] = parts;
  const sectionLabel = SEGMENT_LABELS[section] ?? section;
  const crumbs: BreadcrumbEntry[] = [{ label: shopName, href: base }];

  if (!sub) {
    crumbs.push({ label: sectionLabel });
  } else if (section === "products") {
    crumbs.push({ label: "Products", href: `${base}/products` });
    if (sub === "new") crumbs.push({ label: "New Product" });
    else if (sub2 === "edit") crumbs.push({ label: "Edit Product" });
    else crumbs.push({ label: "Product" });
  } else if (section === "orders") {
    crumbs.push({ label: "Orders", href: `${base}/orders` });
    crumbs.push({ label: "Order Details" });
  } else if (section === "customers") {
    crumbs.push({ label: "Customers", href: `${base}/customers` });
    crumbs.push({ label: "Customer Details" });
  } else if (section === "blogs") {
    crumbs.push({ label: "Blogs", href: `${base}/blogs` });
    if (sub === "new") crumbs.push({ label: "New Post" });
    else if (sub2 === "edit") crumbs.push({ label: "Edit Post" });
    else crumbs.push({ label: "Post" });
  } else {
    crumbs.push({ label: sectionLabel, href: `${base}/${section}` });
    crumbs.push({ label: sub });
  }

  return crumbs;
}

type Props = {
  shops: SidebarShop[];
  currentShop: SidebarShop;
  profile: SidebarProfile;
  children: React.ReactNode;
};

export function DashboardShell({ shops, currentShop, profile, children }: Props) {
  const pathname = usePathname();
  const crumbs = getBreadcrumbs(pathname, currentShop.slug, currentShop.name);

  return (
    <SidebarProvider>
      <AppSidebar shops={shops} currentShop={currentShop} profile={profile} />

      <SidebarInset>
        {/* ── Top header with breadcrumbs ── */}
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border/50 bg-white px-6 dark:bg-slate-950">
          <SidebarTrigger className="-ml-2" />
          <Separator orientation="vertical" className="my-2" />
          <Breadcrumb>
            <BreadcrumbList>
              {crumbs.map((crumb, i) => (
                <span key={i} className="inline-flex items-center gap-1.5">
                  {i > 0 && <BreadcrumbSeparator />}
                  <BreadcrumbItem>
                    {i < crumbs.length - 1 && crumb.href ? (
                      <BreadcrumbLink asChild>
                        <Link href={crumb.href}>{crumb.label}</Link>
                      </BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage className="font-semibold">{crumb.label}</BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                </span>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        {/* ── Page content ── */}
        <div className="flex flex-1 flex-col gap-0 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
