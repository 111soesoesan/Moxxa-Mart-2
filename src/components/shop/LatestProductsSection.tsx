import Link from 'next/link';
import { ProductCard } from '@/components/shared/ProductCard';
import { StarSummary } from '@/components/ratings/StarRating';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

interface LatestProductsSectionProps {
  products: any[];
  shopName: string;
  shopSlug: string;
  ratingAvg?: number | null;
  ratingCount?: number | null;
}

export function LatestProductsSection({
  products,
  shopName,
  shopSlug,
  ratingAvg,
  ratingCount,
}: LatestProductsSectionProps) {
  if (products.length === 0) {
    return (
      <section className="py-12">
        <div className="space-y-4 mb-8">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className="text-2xl font-bold">Latest Products</h2>
            <StarSummary avg={ratingAvg ?? null} count={ratingCount ?? 0} />
          </div>
          <p className="text-muted-foreground">
            {shopName} hasn't listed any products yet. Check back soon!
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div className="space-y-2 min-w-0">
          <div className="flex flex-wrap items-end gap-3">
            <h2 className="text-2xl font-bold">Latest Products</h2>
            <StarSummary avg={ratingAvg ?? null} count={ratingCount ?? 0} />
          </div>
          <p className="text-sm text-muted-foreground">
            Recently added items from {shopName}
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/shop/${shopSlug}/products`}>
            View all products <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {products.map((p) => (
          <ProductCard
            key={p.id}
            product={{
              ...p,
              shops: { name: shopName, slug: shopSlug },
            }}
          />
        ))}
      </div>
    </section>
  );
}
