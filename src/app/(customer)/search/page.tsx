import { Suspense } from "react";
import { getPublicProducts } from "@/actions/products";
import { ProductCard } from "@/components/shared/ProductCard";
import { CategoryNav } from "@/components/layout/CategoryNav";
import { SearchBar } from "@/components/layout/SearchBar";
import { Skeleton } from "@/components/ui/skeleton";

type Props = { searchParams: Promise<{ q?: string; category?: string }> };

async function Results({ query, category }: { query: string; category?: string }) {
  const products = await getPublicProducts({ query, category, limit: 40 });
  if (products.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <p className="text-lg">No results for &ldquo;{query}&rdquo;</p>
        <p className="text-sm mt-1">Try different keywords or browse categories.</p>
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

export default async function SearchPage({ searchParams }: Props) {
  const params = await searchParams;
  const query = params.q ?? "";
  const category = params.category;

  return (
    <>
      <CategoryNav activeCategory={category} />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 max-w-lg">
          <SearchBar initialValue={query} />
        </div>
        {query ? (
          <>
            <p className="text-sm text-muted-foreground mb-4">Results for &ldquo;<strong>{query}</strong>&rdquo;</p>
            <Suspense fallback={<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded-lg" />)}</div>}>
              <Results query={query} category={category} />
            </Suspense>
          </>
        ) : (
          <p className="text-muted-foreground">Enter a search term to find products.</p>
        )}
      </div>
    </>
  );
}
