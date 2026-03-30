import Link from "next/link";
import { searchShops } from "@/actions/shops";
import { MarketplaceShopCard } from "@/components/marketplace/MarketplaceShopCard";
import { OpenShopPromoCard } from "@/components/search/OpenShopPromoCard";

export async function SearchShopMatches({ query }: { query: string }) {
  const q = query.trim();
  if (!q) return null;
  const shops = await searchShops(q, 6);
  if (shops.length === 0) return null;

  return (
    <section className="mb-10 md:mb-12">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3 md:mb-5">
        <h2 className="text-lg font-bold tracking-tight text-foreground md:text-xl">
          Shops matching &ldquo;{q}&rdquo;
        </h2>
        <Link
          href="/shops"
          className="text-sm font-semibold text-primary underline-offset-4 transition-colors hover:underline"
        >
          View all shops
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <OpenShopPromoCard className="min-h-[320px]" />
        {shops.map((s) => (
          <MarketplaceShopCard key={s.id} shop={s} />
        ))}
      </div>
    </section>
  );
}
