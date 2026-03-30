import { Suspense } from "react";
import Link from "next/link";
import { getActiveBrowseCategories } from "@/actions/browseCategories";
import { SearchBar } from "@/components/layout/SearchBar";
import { ProductFilters } from "@/components/filters/ProductFilters";
import { CatalogProductGrid } from "@/components/catalog/CatalogProducts";
import { SearchShopMatches } from "@/components/catalog/SearchShopMatches";
import { SearchRelatedPills } from "@/components/search/SearchRelatedPills";
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
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="aspect-square rounded-xl" />
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
    <div className="min-h-[70vh] bg-muted/10">
      <div className="mx-auto w-full max-w-[1600px] px-3 py-8 sm:px-4 md:px-6 md:py-10 lg:px-8">
        <div className="mx-auto mb-10 w-full max-w-3xl md:mb-12">
          <SearchBar initialValue={query} variant="page" />
        </div>

        {!showResults ? (
          <div className="mx-auto max-w-xl space-y-8 text-center">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">Search the marketplace</h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground md:text-base">
                Find products and shops in one place. For the full catalog with every filter, visit{" "}
                <Link href="/products" className="font-semibold text-primary underline-offset-4 hover:underline">
                  Products
                </Link>
                .
              </p>
            </div>
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Popular categories
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {navItems.slice(0, 8).map((c) => (
                  <Button key={c.slug} variant="secondary" size="sm" className="h-10 min-h-10 font-medium" asChild>
                    <Link href={`/products?browse=${encodeURIComponent(c.slug)}`}>{c.name}</Link>
                  </Button>
                ))}
                <Button variant="outline" size="sm" className="h-10 min-h-10 font-medium" asChild>
                  <Link href="/products">All products</Link>
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {query.trim() ? (
              <div className="mb-8 text-center lg:mb-10 lg:text-left">
                <p className="text-sm text-muted-foreground">Search results for</p>
                <h1 className="mt-1 text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-[2.75rem]">
                  {query.trim()}
                </h1>
              </div>
            ) : (
              <div className="mb-8 lg:mb-10">
                <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">Filtered results</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Refine products with filters <span className="hidden lg:inline">in the sidebar</span>
                  <span className="lg:hidden">— tap Filters below</span>.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(260px,300px)_1fr] lg:gap-10">
              <aside>
                <ProductFilters browseCategories={navItems} />
              </aside>

              <div className="min-w-0">
                {query.trim() ? (
                  <Suspense fallback={null}>
                    <SearchShopMatches query={query} />
                  </Suspense>
                ) : null}

                <section>
                  <div className="mb-4 flex flex-wrap items-end justify-between gap-2 md:mb-5">
                    <h2 className="text-lg font-bold tracking-tight text-foreground md:text-xl">
                      {query.trim() ? (
                        <>
                          Products matching &ldquo;<span className="text-primary">{query.trim()}</span>&rdquo;
                        </>
                      ) : (
                        "Products matching your filters"
                      )}
                    </h2>
                  </div>
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
                      layout="search"
                      searchQuery={query}
                    />
                  </Suspense>
                </section>

                <SearchRelatedPills categories={navItems} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
