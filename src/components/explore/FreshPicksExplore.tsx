import Link from "next/link";
import { getPublicProducts } from "@/actions/products";
import type { CatalogProductBase } from "@/lib/product-pricing";
import { ExploreProductTile, type ExploreProductTileData } from "./ExploreProductTile";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

type EnrichedCatalogProduct = CatalogProductBase & {
  display_price: number;
  display_in_stock: boolean;
  created_at?: string;
};

function toTileData(p: EnrichedCatalogProduct): ExploreProductTileData {
  const shop = p.shops as { name: string; slug: string } | null | undefined;
  return {
    id: p.id,
    name: p.name,
    image_urls: p.image_urls ?? [],
    display_price: p.display_price,
    category: p.category ?? null,
    condition: p.condition,
    product_type: p.product_type ?? "simple",
    created_at: p.created_at ?? "",
    display_in_stock: p.display_in_stock,
    shop_name: shop?.name ?? null,
    shop_slug: shop?.slug ?? null,
  };
}

export async function FreshPicksExplore() {
  const products = await getPublicProducts({ limit: 12, sort: "newest" });
  const tiles = products.map((p) => toTileData(p as EnrichedCatalogProduct));
  if (tiles.length === 0) return null;

  return (
    <section className="mb-8 md:mb-10 pb-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="hidden sm:block w-1 self-stretch min-h-[2.25rem] rounded-full bg-primary shrink-0" aria-hidden />
          <div>
            <span className="text-primary font-bold text-[10px] uppercase tracking-widest block">New arrivals</span>
            <h2 className="text-base md:text-lg font-bold tracking-tight text-foreground">Fresh picks</h2>
          </div>
        </div>
        <Button
          size="sm"
          className="h-10 min-h-10 font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shrink-0"
          asChild
        >
          <Link href="/products">View all products</Link>
        </Button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3">
        {tiles.map((p) => (
          <ExploreProductTile key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}

export function FreshPicksExploreSkeleton() {
  return (
    <section className="mb-8 md:mb-10">
      <div className="flex justify-between mb-3">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-8 w-28" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="rounded-md border p-2 space-y-2">
            <Skeleton className="aspect-square rounded" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </section>
  );
}
