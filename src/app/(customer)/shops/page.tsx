import { Suspense } from "react";
import { getShopsWithFilters } from "@/actions/shops";
import { getActiveBrowseCategories } from "@/actions/browseCategories";
import { MarketplaceShopCard } from "@/components/marketplace/MarketplaceShopCard";
import { ShopFilters } from "@/components/filters/ShopFilters";
import { Skeleton } from "@/components/ui/skeleton";

type Props = { searchParams: Promise<{ q?: string; location?: string; browse?: string; sort?: string }> };

async function ShopsGrid({
  query,
  location,
  browseSlug,
  sort,
}: {
  query?: string;
  location?: string;
  browseSlug?: string;
  sort?: "newest" | "products-high-low" | "alphabetical";
}) {
  const shops = await getShopsWithFilters({
    query,
    location,
    browseSlug,
    limit: 24,
    sort,
  });

  if (shops.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-lg">No shops found.</p>
        <p className="text-sm mt-1">Try adjusting your search or filters.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {shops.map((shop) => (
        <MarketplaceShopCard key={shop.id} shop={shop} />
      ))}
    </div>
  );
}

function ShopsGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-xl border border-border/60">
          <Skeleton className="aspect-[16/9] w-full rounded-none" />
          <div className="space-y-2 p-4">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-px w-full" />
            <div className="flex justify-between pt-1">
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function ShopsPage({ searchParams }: Props) {
  const params = await searchParams;
  const query = params.q;
  const location = params.location;
  const browseSlug = params.browse;
  const sort = (params.sort as "newest" | "products-high-low" | "alphabetical") || "newest";
  const browseNav = await getActiveBrowseCategories();
  const navItems = browseNav.map((c) => ({ slug: c.slug, name: c.name }));

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Shop Directory</h1>
        <p className="text-muted-foreground mt-2">Discover verified shops from trusted vendors</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <ShopFilters browseCategories={navItems} />
        </div>

        <div className="lg:col-span-3">
          <Suspense fallback={<ShopsGridSkeleton />}>
            <ShopsGrid query={query} location={location} browseSlug={browseSlug} sort={sort} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
