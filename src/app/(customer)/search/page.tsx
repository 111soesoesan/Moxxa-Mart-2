import { Suspense } from "react";
import Link from "next/link";
import { getActiveBrowseCategories } from "@/actions/browseCategories";
import { SearchBar } from "@/components/layout/SearchBar";
import { ProductFilters } from "@/components/filters/ProductFilters";
import { CatalogProductGrid } from "@/components/catalog/CatalogProducts";
import { SearchShopMatches } from "@/components/catalog/SearchShopMatches";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

type Props = {
  searchParams: Promise<{
    q?: string;
    category?: string;
    browse?: string;
    shop?: string;
    minPrice?: string;
    maxPrice?: string;
    condition?: string | string[];
    inStock?: string;
    sort?: string;
  }>;
};

function ResultsSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="aspect-square rounded-lg" />
      ))}
    </div>
  );
}

export default async function SearchPage({ searchParams }: Props) {
  const params = await searchParams;
  const query = params.q ?? "";
  const browse = params.browse;
  const category = !browse ? params.category : undefined;
  const shopId = params.shop;
  const minPrice = params.minPrice ? parseInt(params.minPrice, 10) : undefined;
  const maxPrice = params.maxPrice ? parseInt(params.maxPrice, 10) : undefined;
  const condition = params.condition
    ? Array.isArray(params.condition)
      ? params.condition
      : [params.condition]
    : undefined;
  const inStock = params.inStock === "true";
  const sort = (params.sort as "newest" | "price-low-high" | "price-high-low") || "newest";

  const browseNav = await getActiveBrowseCategories();
  const navItems = browseNav.map((c) => ({ slug: c.slug, name: c.name }));

  const showResults = !!(
    query.trim() ||
    browse ||
    category ||
    shopId ||
    minPrice ||
    maxPrice ||
    condition?.length ||
    inStock ||
    sort !== "newest"
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Search</h1>
        <p className="text-muted-foreground text-sm mb-6">
          Find products and shops across the marketplace. For category browsing and the full catalog, visit{" "}
          <Link href="/products" className="text-primary underline-offset-4 hover:underline">
            Products
          </Link>
          .
        </p>
        <div className="max-w-xl mx-auto">
          <SearchBar initialValue={query} />
        </div>
      </div>

      {!showResults ? (
        <div className="max-w-2xl mx-auto space-y-6 text-center">
          <p className="text-muted-foreground">
            Enter a search term above, or jump into a browse category.
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {navItems.slice(0, 8).map((c) => (
              <Button key={c.slug} variant="secondary" size="sm" asChild>
                <Link href={`/products?browse=${encodeURIComponent(c.slug)}`}>{c.name}</Link>
              </Button>
            ))}
            <Button variant="outline" size="sm" asChild>
              <Link href="/products">All products</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <ProductFilters browseCategories={navItems} />
          </div>
          <div className="lg:col-span-3">
            {query.trim() ? (
              <Suspense fallback={null}>
                <SearchShopMatches query={query} />
              </Suspense>
            ) : null}
            <div>
              <p className="text-sm text-muted-foreground mb-4">
                Products
                {query.trim() ? (
                  <>
                    {" "}
                    matching &ldquo;<strong>{query}</strong>&rdquo;
                  </>
                ) : (
                  <> matching your filters</>
                )}
              </p>
              <Suspense fallback={<ResultsSkeleton />}>
                <CatalogProductGrid
                  query={query}
                  browseSlug={browse}
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
      )}
    </div>
  );
}
