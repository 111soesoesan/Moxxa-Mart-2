import Link from "next/link";
import { getPublicProducts } from "@/actions/products";
import { MarketplaceProductTile } from "@/components/marketplace/MarketplaceProductTile";
import {
  toMarketplaceProductTileData,
  type EnrichedCatalogRow as EnrichedProduct,
} from "@/lib/marketplace-utils";
import type { CatalogProductBase } from "@/lib/product-pricing";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";


export async function CatalogProductGrid({
  query = "",
  browseSlug,
  category,
  shopId,
  minPrice,
  maxPrice,
  condition,
  inStock,
  sort,
  limit = 40,
  layout = "default",
  searchQuery = "",
  shopTileOverride,
}: {
  query?: string;
  browseSlug?: string;
  category?: string;
  shopId?: string;
  minPrice?: number;
  maxPrice?: number;
  condition?: string[];
  inStock?: boolean;
  sort?: "newest" | "price-low-high" | "price-high-low";
  limit?: number;
  layout?: "default" | "search";
  searchQuery?: string;
  /** When listing a single shop, pass canonical name/slug for the tile mapper */
  shopTileOverride?: { name: string; slug: string } | null;
}) {
  const products = await getPublicProducts({
    query,
    browseSlug,
    category: !browseSlug ? category : undefined,
    shopId,
    limit,
    minPrice,
    maxPrice,
    condition,
    inStock,
    sort,
  });

  const q = searchQuery.trim();
  const clearFiltersHref = q ? `/search?q=${encodeURIComponent(q)}` : "/search";

  if (products.length === 0) {
    if (layout === "search") {
      return (
        <div className="rounded-xl border border-dashed border-border/80 bg-muted/25 px-6 py-14 text-center md:py-16">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Search className="h-7 w-7" aria-hidden />
          </div>
          <h3 className="mt-5 text-lg font-bold text-foreground">No products found</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            Try clearing some filters or browsing the catalog—new listings are added often.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button className="h-10 min-h-10 min-w-[160px] font-semibold" asChild>
              <Link href={clearFiltersHref}>Clear all filters</Link>
            </Button>
            <Button variant="outline" className="h-10 min-h-10 min-w-[160px] font-semibold border-border/80" asChild>
              <Link href="/products">Explore categories</Link>
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="py-16 text-center text-muted-foreground">
        <p className="text-lg">No products found.</p>
        <p className="mt-1 text-sm">Try adjusting filters or browse another category.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-3 md:gap-5 lg:grid-cols-4 xl:grid-cols-5">
      {products.map((p) => (
        <MarketplaceProductTile
          key={p.id}
          product={toMarketplaceProductTileData(p as EnrichedProduct, shopTileOverride ?? null)}
        />
      ))}
    </div>
  );
}
