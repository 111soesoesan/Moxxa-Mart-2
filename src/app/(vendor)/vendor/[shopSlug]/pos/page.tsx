import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyShops } from "@/actions/shops";
import { getPOSProducts } from "@/actions/pos";
import { getShopCategories } from "@/actions/categories";
import { getShopPaymentMethods } from "@/actions/paymentMethods";
import { POSTerminal } from "@/components/pos/POSTerminal";

type Props = { params: Promise<{ shopSlug: string }> };

export const metadata = { title: "POS Terminal" };

export default async function POSPage({ params }: Props) {
  const { shopSlug } = await params;

  const shops = await getMyShops();
  const shop = shops.find((s) => s.slug === shopSlug);
  if (!shop) notFound();

  const [products, categories, methodsResult] = await Promise.all([
    getPOSProducts(shop.id),
    getShopCategories(shop.id),
    getShopPaymentMethods(shop.id),
  ]);

  const paymentMethods = (methodsResult.data ?? []).filter((m) => m.is_active);

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <POSTerminal
        shopId={shop.id}
        shopSlug={shopSlug}
        products={products}
        categories={categories}
        paymentMethods={paymentMethods as { id: string; name: string; type: string }[]}
      />
    </div>
  );
}
