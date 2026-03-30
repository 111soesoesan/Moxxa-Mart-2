import Link from "next/link";
import { getActiveShops } from "@/actions/shops";
import { MarketplaceShopCard } from "@/components/marketplace/MarketplaceShopCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export async function FeaturedShopsExplore() {
  const shops = await getActiveShops(12);
  if (shops.length === 0) return null;

  return (
    <section className="mb-6 md:mb-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="hidden sm:block w-1 self-stretch min-h-[2.25rem] rounded-full bg-primary shrink-0" aria-hidden />
          <div>
            <span className="text-primary font-bold text-[10px] uppercase tracking-widest block">Curation</span>
            <h2 className="text-base md:text-lg font-bold tracking-tight text-foreground">Featured shops</h2>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-10 min-h-10 shrink-0 border-primary/30 bg-primary/10 text-primary font-semibold hover:bg-primary/15 hover:text-primary"
          asChild
        >
          <Link href="/shops">View all shops</Link>
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5">
        {shops.map((s) => (
          <MarketplaceShopCard key={s.id} shop={s} />
        ))}
      </div>
    </section>
  );
}

export function FeaturedShopsExploreSkeleton() {
  return (
    <section className="mb-6 md:mb-8">
      <div className="flex justify-between mb-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-14" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-xl border border-border/60 bg-card">
            <Skeleton className="aspect-[16/9] w-full rounded-none" />
            <div className="space-y-2 p-4">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-px w-full" />
              <div className="flex justify-between">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
