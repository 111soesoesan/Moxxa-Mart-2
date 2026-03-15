import { Suspense } from "react";
import { getPublicProducts } from "@/actions/products";
import { getActiveShops } from "@/actions/shops";
import { ProductCard } from "@/components/shared/ProductCard";
import { ShopCard } from "@/components/shared/ShopCard";
import { HeroBanner } from "@/components/shared/HeroBanner";
import { CategoryNav } from "@/components/layout/CategoryNav";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
    <section className="container mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Featured Shops</h2>
          <p className="text-sm text-muted-foreground mt-1">Explore curated sellers</p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/shops">Browse All</Link>
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

function PromoCard({ title, description, icon }: { title: string; description: string; icon: string }) {
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-6 space-y-3">
        <div className="text-4xl">{icon}</div>
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

export default async function HomePage({ searchParams }: Props) {
  const params = await searchParams;
  const category = params.category;

  return (
    <>
      <CategoryNav activeCategory={category} />

      {!category && (
        <>
          {/* Hero Banner */}
          <HeroBanner
            title="Discover Amazing Products & Shops"
            subtitle="Buy and sell from trusted vendors in your community. Curated marketplace with quality merchants."
            ctaText="Browse Products"
            ctaHref="/search"
            secondaryCta={{
              text: "Become a Vendor",
              href: "/vendor/onboarding",
            }}
          />

          {/* Value Propositions */}
          <section className="container mx-auto px-4 py-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <PromoCard
                icon="✨"
                title="Quality Assured"
                description="All shops and products are verified to ensure the best experience."
              />
              <PromoCard
                icon="🚀"
                title="Fast & Reliable"
                description="Quick checkout and reliable payment methods for peace of mind."
              />
              <PromoCard
                icon="🤝"
                title="Support Community"
                description="Shop from local vendors and support businesses in your area."
              />
            </div>
          </section>

          {/* Featured Shops */}
          <Suspense fallback={<div className="container mx-auto px-4 py-8"><Skeleton className="h-32 w-full rounded-xl" /></div>}>
            <ShopRow />
          </Suspense>
        </>
      )}

      {/* Products Section */}
      <section className="container mx-auto px-4 pb-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">
              {category
                ? `${category.charAt(0).toUpperCase() + category.slice(1)} Products`
                : "Latest Products"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {category ? "Browse all items in this category" : "Newly listed from trusted sellers"}
            </p>
          </div>
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
