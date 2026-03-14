import { notFound } from "next/navigation";
import { getMyShops } from "@/actions/shops";
import { getProfile } from "@/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import type { SidebarShop, SidebarProfile } from "@/components/dashboard/AppSidebar";

type Props = { children: React.ReactNode; params: Promise<{ shopSlug: string }> };

export default async function ShopDashboardLayout({ children, params }: Props) {
  const { shopSlug } = await params;

  const [shops, profile] = await Promise.all([
    getMyShops(),
    getProfile(),
  ]);

  const shop = shops.find((s) => s.slug === shopSlug);
  if (!shop) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const sidebarShops: SidebarShop[] = shops.map((s) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    status: s.status,
    logo_url: s.logo_url,
  }));

  const currentShop: SidebarShop = {
    id: shop.id,
    name: shop.name,
    slug: shop.slug,
    status: shop.status,
    logo_url: shop.logo_url,
  };

  const sidebarProfile: SidebarProfile = {
    full_name: profile?.full_name,
    avatar_url: profile?.avatar_url,
    role: profile?.role,
    email: user?.email,
  };

  return (
    <DashboardShell
      shops={sidebarShops}
      currentShop={currentShop}
      profile={sidebarProfile}
    >
      {children}
    </DashboardShell>
  );
}
