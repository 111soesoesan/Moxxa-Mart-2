import { Suspense } from "react";
import { getActiveBrowseCategories, getBrowseCategoryIdBySlug } from "@/actions/browseCategories";
import { CategoryNav } from "@/components/layout/CategoryNav";
import { ProductFilters } from "@/components/filters/ProductFilters";
import { CatalogProductGrid } from "@/components/catalog/CatalogProducts";
import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  searchParams: Promise<{
    browse?: string;
    category?: string;
    q?: string;
    shop?: string;
    minPrice?: string;
    maxPrice?: string;
    condition?: string | string[];
    inStock?: string;
    sort?: string;
  }>;
};

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {Array.from({ length: 10 }).map((_, i) => (
        <Skeleton key={i} className="aspect-square rounded-lg" />
      ))}
    </div>
  );
}

export default async function ProductsPage({ searchParams }: Props) {
  const params = await searchParams;
  const browse = params.browse;
  const legacyCategory = !browse ? params.category : undefined;
  const query = params.q ?? "";
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

  const [browseNav, browseMeta] = await Promise.all([
    getActiveBrowseCategories(),
    browse ? getBrowseCategoryIdBySlug(browse) : Promise.resolve(null),
  ]);

  const navItems = browseNav.map((c) => ({ slug: c.slug, name: c.name }));
  const browseLabel = browseMeta?.name ?? (legacyCategory ? legacyCategory.replace(/-/g, " ") : undefined);
  const title = browseLabel ? `${browseLabel} — products` : "Browse products";

  return (
    <>
      <CategoryNav
        categories={navItems}
        activeBrowseSlug={browse}
        buildHref={(slug) => (slug ? `/products?browse=${encodeURIComponent(slug)}` : "/products")}
      />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="text-muted-foreground mt-2">
            Filter by price, condition, and stock. Use search for keywords—results stay on this page when you apply
            filters.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <ProductFilters browseCategories={navItems} />
          </div>
          <div className="lg:col-span-3">
            <p className="text-sm text-muted-foreground mb-4">
              {query ? (
                <>
                  Showing products matching &ldquo;<strong>{query}</strong>&rdquo;
                  {browseLabel ? (
                    <>
                      {" "}
                      in <strong>{browseLabel}</strong>
                    </>
                  ) : null}
                </>
              ) : browseLabel ? (
                <>
                  Category: <strong>{browseLabel}</strong>
                </>
              ) : (
                <>Latest listings from marketplace sellers</>
              )}
            </p>
            <Suspense fallback={<GridSkeleton />}>
              <CatalogProductGrid
                query={query}
                browseSlug={browse}
                category={legacyCategory}
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
    </>
  );
}
