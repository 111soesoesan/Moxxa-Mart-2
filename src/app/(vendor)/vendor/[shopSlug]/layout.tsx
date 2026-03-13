import Link from "next/link";
import { notFound } from "next/navigation";
import { getMyShops } from "@/actions/shops";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type Props = { children: React.ReactNode; params: Promise<{ shopSlug: string }> };

const navLinks = (slug: string) => [
  { href: `/vendor/${slug}`, label: "Dashboard" },
  { href: `/vendor/${slug}/products`, label: "Products" },
  { href: `/vendor/${slug}/orders`, label: "Orders" },
  { href: `/vendor/${slug}/billing`, label: "Billing" },
  { href: `/vendor/${slug}/settings`, label: "Settings" },
];

export default async function ShopDashboardLayout({ children, params }: Props) {
  const { shopSlug } = await params;
  const shops = await getMyShops();
  const shop = shops.find((s) => s.slug === shopSlug);
  if (!shop) notFound();

  return (
    <div className="min-h-screen">
      <div className="border-b bg-muted/40">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4 py-3">
            <Link href="/vendor" className="text-sm text-muted-foreground hover:text-foreground">
              ← All Shops
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="font-semibold text-sm">{shop.name}</span>
          </div>
          <ScrollArea className="w-full">
            <nav className="flex gap-1 pb-px">
              {navLinks(shopSlug).map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="shrink-0 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground border-b-2 border-transparent hover:border-foreground transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      </div>
      <div>{children}</div>
    </div>
  );
}
