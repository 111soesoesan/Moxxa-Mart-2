import { Suspense } from "react";
import { getPublicProducts } from "@/actions/products";
import { getActiveShops } from "@/actions/shops";
import { ProductCard } from "@/components/shared/ProductCard";
import { ShopCard } from "@/components/shared/ShopCard";
import { CategoryNav } from "@/components/layout/CategoryNav";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type Props = { searchParams: Promise<{ category?: string }> };

async function ProductGrid({ category }: { category?: string }) {
  const products = await getPublicProducts({ category, limit: 20 });
  if (products.length === 0) {
    return (
      <div className="col-span-full text-center py-16 text-muted-foreground">
        <p className="text-lg">No products found.</p>
        <p className="text-sm mt-1">Check back soon — vendors are adding listings every day.</p>
      </div>
    );
  }
  return (
    <>
      {products.map((p) => (
        <ProductCard key={p.id} product={{ ...p, shops: p.shops as { name: string; slug: string } | null }} />
      ))}
    </>
  );
}

async function ShopRow() {
  const shops = await getActiveShops(6);
  if (shops.length === 0) return null;
  return (
    <section className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Featured Shops</h2>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/search?type=shop">View all</Link>
        </Button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {shops.map((s) => <ShopCard key={s.id} shop={s} />)}
      </div>
    </section>
  );
}

function ProductGridSkeleton() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="aspect-square w-full rounded-lg" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </>
  );
}

export default async function HomePage({ searchParams }: Props) {
  const params = await searchParams;
  const category = params.category;

  return (
    <>
      <CategoryNav activeCategory={category} />

      <Suspense fallback={<div className="container mx-auto px-4 py-8"><Skeleton className="h-32 w-full rounded-xl" /></div>}>
        <ShopRow />
      </Suspense>

      <section className="container mx-auto px-4 pb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">
            {category
              ? `${category.charAt(0).toUpperCase() + category.slice(1)} Products`
              : "Latest Products"}
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <Suspense fallback={<ProductGridSkeleton />}>
            <ProductGrid category={category} />
          </Suspense>
        </div>
      </section>
    </>
  );
}
