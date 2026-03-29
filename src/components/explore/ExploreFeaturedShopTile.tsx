import Link from "next/link";
import Image from "next/image";
import { MapPin, Star, Store } from "lucide-react";

export type FeaturedShop = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  shop_bio?: string | null;
  logo_url?: string | null;
  cover_url?: string | null;
  location?: string | null;
  rating_avg?: number | null;
  rating_count?: number | null;
};

function formatReviewCount(n: number) {
  if (n >= 1000) return `${Math.round(n / 1000)}k+`;
  return String(n);
}

function ShopRatingInline({
  avg,
  count,
}: {
  avg: number | null | undefined;
  count: number;
}) {
  if (count <= 0 || avg == null) {
    return <span className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0">No reviews</span>;
  }
  return (
    <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground whitespace-nowrap shrink-0 tabular-nums">
      <Star className="h-3.5 w-3.5 fill-primary text-primary" aria-hidden />
      <span className="font-semibold text-foreground">{Number(avg).toFixed(1)}</span>
      <span className="text-muted-foreground">({formatReviewCount(count)})</span>
    </span>
  );
}

export function ExploreFeaturedShopTile({ shop }: { shop: FeaturedShop }) {
  const blurb = shop.description?.trim() || shop.shop_bio?.trim() || "";
  const image = shop.cover_url || shop.logo_url;
  const location = shop.location?.trim();

  return (
    <Link href={`/shop/${shop.slug}`} className="group flex flex-col h-full gap-2.5 sm:gap-3 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-2xl">
      <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-muted">
        {image ? (
          <Image
            src={image}
            alt={shop.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 20vw, 16vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground bg-muted">
            <Store className="h-10 w-10 opacity-30 text-primary" strokeWidth={1.25} aria-hidden />
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5 px-0.5">
        <div className="flex items-start justify-between gap-2">
          <h4 className="min-w-0 flex-1 text-sm font-bold leading-snug text-foreground line-clamp-2 transition-colors group-hover:text-primary">
            {shop.name}
          </h4>
          <ShopRatingInline avg={shop.rating_avg ?? null} count={shop.rating_count ?? 0} />
        </div>

        {blurb ? (
          <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2">{blurb}</p>
        ) : (
          <p className="text-xs italic text-muted-foreground/90">Independent seller on Moxxa Mart</p>
        )}

        <div className="mt-auto flex items-center gap-1 text-xs text-muted-foreground pt-0.5">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-primary/80" aria-hidden />
          <span className="line-clamp-1">{location || "Location not listed"}</span>
        </div>
      </div>
    </Link>
  );
}
