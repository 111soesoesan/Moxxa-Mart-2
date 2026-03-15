import { Suspense } from "react";
import { getShopsWithFilters } from "@/actions/shops";
import { ShopCard } from "@/components/shared/ShopCard";
import { ShopFilters } from "@/components/filters/ShopFilters";
import { Skeleton } from "@/components/ui/skeleton";

type Props = { searchParams: Promise<{ q?: string; location?: string; sort?: string }> };

async function ShopsGrid({
  query,
  location,
  sort,
}: {
  query?: string;
  location?: string;
  sort?: "newest" | "products-high-low" | "alphabetical";
}) {
  const shops = await getShopsWithFilters({
    query,
    location,
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
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {shops.map((shop) => (
        <ShopCard key={shop.id} shop={shop} />
      ))}
    </div>
  );
}

function ShopsGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <Skeleton key={i} className="aspect-square rounded-lg" />
      ))}
    </div>
  );
}

export default async function ShopsPage({ searchParams }: Props) {
  const params = await searchParams;
  const query = params.q;
  const location = params.location;
  const sort = (params.sort as "newest" | "products-high-low" | "alphabetical") || "newest";

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Shop Directory</h1>
        <p className="text-muted-foreground mt-2">Discover verified shops from trusted vendors</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1">
          <ShopFilters />
        </div>

        {/* Shops Grid */}
        <div className="lg:col-span-3">
          <Suspense fallback={<ShopsGridSkeleton />}>
            <ShopsGrid query={query} location={location} sort={sort} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
