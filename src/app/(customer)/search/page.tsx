import { Suspense } from "react";
import { getPublicProducts } from "@/actions/products";
import { searchShops } from "@/actions/shops";
import { ProductCard } from "@/components/shared/ProductCard";
import { ShopCard } from "@/components/shared/ShopCard";
import { CategoryNav } from "@/components/layout/CategoryNav";
import { SearchBar } from "@/components/layout/SearchBar";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

type Props = { searchParams: Promise<{ q?: string; category?: string; shop?: string }> };

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

async function ProductResults({ query, category, shopId }: { query: string; category?: string; shopId?: string }) {
  const products = await getPublicProducts({ query, category, shopId, limit: 40 });
  if (products.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-lg">No products found{query ? ` for "${query}"` : ""}.</p>
        <p className="text-sm mt-1">Try different keywords or browse a category.</p>
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

  return (
    <>
      <CategoryNav activeCategory={category} />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 max-w-lg">
          <SearchBar initialValue={query} />
        </div>

        {query ? (
          <>
            <Suspense fallback={null}>
              <ShopResults query={query} />
            </Suspense>

            <div>
              <p className="text-sm text-muted-foreground mb-4">
                Products{category ? ` in ${category}` : ""} matching &ldquo;<strong>{query}</strong>&rdquo;
              </p>
              <Suspense fallback={<ResultsSkeleton />}>
                <ProductResults query={query} category={category} shopId={shopId} />
              </Suspense>
            </div>
          </>
        ) : category ? (
          <>
            <p className="text-sm text-muted-foreground mb-4">Browsing <strong>{category}</strong></p>
            <Suspense fallback={<ResultsSkeleton />}>
              <ProductResults query="" category={category} />
            </Suspense>
          </>
        ) : (
          <p className="text-muted-foreground">Enter a search term or pick a category to find products.</p>
        )}
      </div>
    </>
  );
}
