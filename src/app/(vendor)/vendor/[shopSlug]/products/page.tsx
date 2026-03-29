import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getMyShops } from "@/actions/shops";
import { getShopProductsWithDetails } from "@/actions/products";
import { getActiveBrowseCategories } from "@/actions/browseCategories";
import ProductsTable from "@/components/vendor/products/ProductsTable";

export default async function AllProductsPage({ params }: { params: Promise<{ shopSlug: string }> }) {
  const shops = await getMyShops();
  const { shopSlug } = await params;
  const shop = shops.find((s) => s.slug === shopSlug);

  if (shop == null) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center">
        <h1 className="text-xl font-semibold">Shop not found or you do not have access.</h1>
        <Button asChild>
          <Link href="/vendor">Back to Vendor Dashboard</Link>
        </Button>
      </div>
    );
  }

  const [products, browseCategories] = await Promise.all([
    getShopProductsWithDetails(shop.id),
    getActiveBrowseCategories(),
  ]);

  return (
    <ProductsTable
      shopSlug={shopSlug}
      initialProducts={(products ?? []) as never}
      browseCategories={browseCategories.map((b) => ({ id: b.id, name: b.name }))}
    />
  );
}
