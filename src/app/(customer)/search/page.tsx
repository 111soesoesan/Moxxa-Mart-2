import { Suspense } from "react";
import { getPublicProducts } from "@/actions/products";
import { searchShops } from "@/actions/shops";
import { ProductCard } from "@/components/shared/ProductCard";
import { ShopCard } from "@/components/shared/ShopCard";
import { ProductFilters } from "@/components/filters/ProductFilters";
import { CategoryNav } from "@/components/layout/CategoryNav";
import { SearchBar } from "@/components/layout/SearchBar";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

type Props = { searchParams: Promise<{ q?: string; category?: string; shop?: string; minPrice?: string; maxPrice?: string; condition?: string | string[]; inStock?: string; sort?: string }> };

async function ShopResults({ query }: { query: string }) {
  const shops = await searchShops(query, 6);
  if (shops.length === 0) return null;
  return (
    <section className="mb-8">
      <h2 className="text-base font-semibold mb-3">Shops matching &ldquo;{query}&rdquo;</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {shops.map((s) => <ShopCard key={s.id} shop={s} />)}
      </div>
      <Separator className="mt-8" />
    </section>
  );
}

async function ProductResults({
  query,
  category,
  shopId,
  minPrice,
  maxPrice,
  condition,
  inStock,
  sort,
}: {
  query: string;
  category?: string;
  shopId?: string;
  minPrice?: number;
  maxPrice?: number;
  condition?: string[];
  inStock?: boolean;
  sort?: "newest" | "price-low-high" | "price-high-low";
}) {
  const products = await getPublicProducts({
    query,
    category,
    shopId,
    limit: 40,
    minPrice,
    maxPrice,
    condition,
    inStock,
    sort,
  });
  if (products.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-lg">No products found{query ? ` for "${query}"` : ""}.</p>
        <p className="text-sm mt-1">Try adjusting your filters or search terms.</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={{ ...p, shops: p.shops as { name: string; slug: string } | null }} />
      ))}
    </div>
  );
}

function ResultsSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded-lg" />)}
    </div>
  );
}

export default async function SearchPage({ searchParams }: Props) {
  const params = await searchParams;
  const query = params.q ?? "";
  const category = params.category;
  const shopId = params.shop;
  const minPrice = params.minPrice ? parseInt(params.minPrice) : undefined;
  const maxPrice = params.maxPrice ? parseInt(params.maxPrice) : undefined;
  const condition = params.condition ? (Array.isArray(params.condition) ? params.condition : [params.condition]) : undefined;
  const inStock = params.inStock === "true";
  const sort = (params.sort as "newest" | "price-low-high" | "price-high-low") || "newest";

  return (
    <>
      <CategoryNav activeCategory={category} />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 max-w-lg">
          <SearchBar initialValue={query} />
        </div>

        {query || category ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Filters Sidebar */}
            <div className="lg:col-span-1">
              <ProductFilters />
            </div>

            {/* Results */}
            <div className="lg:col-span-3">
              <Suspense fallback={null}>
                <ShopResults query={query} />
              </Suspense>

              <div>
                <p className="text-sm text-muted-foreground mb-4">
                  Products{category ? ` in ${category}` : ""} matching &ldquo;<strong>{query || "browse"}</strong>&rdquo;
                </p>
                <Suspense fallback={<ResultsSkeleton />}>
                  <ProductResults
                    query={query}
                    category={category}
                    shopId={shopId}
                    minPrice={minPrice}
                    maxPrice={maxPrice}
                    condition={condition}
                    inStock={inStock}
                    sort={sort}
                  />
                </Suspense>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground">Enter a search term or pick a category to find products.</p>
        )}
      </div>
    </>
  );
}
