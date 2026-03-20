import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getMyShops } from "@/actions/shops";
import { getShopProductsWithDetails } from "@/actions/products";
import ProductsTable from "@/components/vendor/products/ProductsTable";

export default async function AllProductsPage({ params }: { params: { shopSlug: string } }) {
  const shops = await getMyShops();
  const { shopSlug } = await params;
  const shop = shops.find((s) => s.slug === shopSlug);
  console.log("params: ",shopSlug)
  console.log("shops: ",shops)
  console.log("shop: ",shop)

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

  const products = (await getShopProductsWithDetails(shop.id)) ?? [];

  return <ProductsTable shopSlug={shopSlug} initialProducts={products as any} />;
}
