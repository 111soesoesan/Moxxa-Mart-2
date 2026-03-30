import Link from 'next/link';
import { MarketplaceProductTile } from '@/components/marketplace/MarketplaceProductTile';
import { toMarketplaceProductTileData, type EnrichedCatalogRow } from '@/lib/marketplace-utils';
import type { CatalogProductBase } from '@/lib/product-pricing';
import { StarSummary } from '@/components/ratings/StarRating';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

/** Listing rows from `getPublicProducts` are enriched but TS may omit `shop_id`; we always pass `shopId`. */
type LatestProductRow = CatalogProductBase & {
  display_price: number;
  display_in_stock: boolean;
};

interface LatestProductsSectionProps {
  products: LatestProductRow[];
  shopId: string;
  shopName: string;
  shopSlug: string;
  ratingAvg?: number | null;
  ratingCount?: number | null;
  /** Shop homepage: tighter grid; summary stars are shown in the sidebar instead */
  layout?: "default" | "shopHome";
}

export function LatestProductsSection({
  products,
  shopId,
  shopName,
  shopSlug,
  ratingAvg,
  ratingCount,
  layout = "default",
}: LatestProductsSectionProps) {
  const isShopHome = layout === "shopHome";
  const showStars = !isShopHome;

  if (products.length === 0) {
    return (
      <section className={isShopHome ? "py-6 lg:py-0" : "py-12"}>
        <div className="mb-8 space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className="text-2xl font-bold">Latest Products</h2>
            {showStars ? <StarSummary avg={ratingAvg ?? null} count={ratingCount ?? 0} /> : null}
          </div>
          <p className="text-muted-foreground">
            {shopName} hasn't listed any products yet. Check back soon!
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className={isShopHome ? "py-6 lg:py-0" : "py-12"}>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-end gap-3">
            <h2 className="text-2xl font-bold">Latest Products</h2>
            {showStars ? <StarSummary avg={ratingAvg ?? null} count={ratingCount ?? 0} /> : null}
          </div>
          <p className="text-sm text-muted-foreground">
            Recently added items from {shopName}
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/shop/${shopSlug}/products`} className={isShopHome ? "gap-1.5 font-bold uppercase tracking-wide text-primary" : ""}>
            {isShopHome ? "View all" : "View all products"}
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      <div
        className={
          isShopHome
            ? "grid grid-cols-2 gap-3 sm:gap-4"
            : "grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
        }
      >
        {products.map((p) => {
          const withShop: EnrichedCatalogRow = {
            ...(p as EnrichedCatalogRow),
            shop_id: (p as { shop_id?: string }).shop_id ?? shopId,
          };
          return (
            <MarketplaceProductTile
              key={p.id}
              product={toMarketplaceProductTileData(withShop, { name: shopName, slug: shopSlug })}
            />
          );
        })}
      </div>
    </section>
  );
}
