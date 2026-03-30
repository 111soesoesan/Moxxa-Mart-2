import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Briefcase, MapPin, Star, Store } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export type MarketplaceShopCardShop = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  shop_bio?: string | null;
  logo_url?: string | null;
  cover_url?: string | null;
  /** Set from vendor Appearance uploads; preferred over legacy logo/cover when present */
  profile_image_url?: string | null;
  banner_image_url?: string | null;
  location?: string | null;
  rating_avg?: number | null;
  rating_count?: number | null;
  /** From `browse_categories(name, slug)` join when selected in queries */
  browse_categories?: { name: string; slug?: string | null } | null;
};

type Props = {
  shop: MarketplaceShopCardShop;
  className?: string;
};

function formatReviewCount(n: number) {
  if (n >= 1000) return `${Math.round(n / 1000)}k+`;
  return String(n);
}

/**
 * Block-style shop card: banner, logo overlapping bottom-left of banner, title, category tag, bio, footer (rating + visit).
 */
export function MarketplaceShopCard({ shop, className }: Props) {
  const bio = shop.description?.trim() || shop.shop_bio?.trim() || "";
  const categoryName =
    shop.browse_categories && typeof shop.browse_categories === "object"
      ? shop.browse_categories.name?.trim() || null
      : null;
  const bannerSrc =
    shop.cover_url?.trim() || shop.banner_image_url?.trim() || null;
  const logoSrc =
    shop.logo_url?.trim() || shop.profile_image_url?.trim() || null;
  const locationLine = shop.location?.trim() || null;
  const avg = shop.rating_avg;
  const count = shop.rating_count ?? 0;

  return (
    <Link
      href={`/shop/${shop.slug}`}
      className={cn(
        "group flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-border/70 bg-card text-left shadow-sm transition-[box-shadow,transform] hover:shadow-md active:scale-[0.99]",
        "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className
      )}
    >
      <div className="relative aspect-[16/9] w-full shrink-0 bg-muted">
        {bannerSrc ? (
          <Image
            src={bannerSrc}
            alt=""
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 18vw"
            priority={false}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted via-muted to-primary/10">
            <Store className="h-14 w-14 text-muted-foreground/25" strokeWidth={1} aria-hidden />
          </div>
        )}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/45 via-black/15 to-transparent"
          aria-hidden
        />
        <div className="absolute bottom-3 left-3 z-[1] h-[3.25rem] w-[3.25rem]">
          <div className="relative h-full w-full overflow-hidden rounded-full border-2 border-background bg-background shadow-md ring-1 ring-black/5">
            {logoSrc ? (
              <Image
                src={logoSrc}
                alt={`${shop.name} logo`}
                fill
                className="object-cover"
                sizes="52px"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-muted/80">
                <Store className="h-7 w-7 text-primary/50" strokeWidth={1.25} aria-hidden />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col p-4 pt-3">
        <h3 className="text-base font-bold leading-snug text-foreground line-clamp-2 group-hover:text-primary transition-colors">
          {shop.name}
        </h3>

        {locationLine ? (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-primary/70" aria-hidden />
            <span className="line-clamp-1">{locationLine}</span>
          </p>
        ) : null}

        {categoryName ? (
          <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-primary/90">
            <Briefcase className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
            <span className="line-clamp-1">{categoryName}</span>
          </p>
        ) : null}

        <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground line-clamp-3">
          {bio || "Independent seller on Moxxa Mart."}
        </p>

        <Separator className="my-3 bg-border/60" />

        <div className="mt-auto flex min-w-0 items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            {count > 0 && avg != null ? (
              <p className="flex min-w-0 items-center gap-1 text-sm text-muted-foreground tabular-nums">
                <Star className="h-4 w-4 shrink-0 fill-primary text-primary" aria-hidden />
                <span className="font-semibold text-foreground">{Number(avg).toFixed(1)}</span>
                <span className="truncate text-muted-foreground">({formatReviewCount(count)})</span>
              </p>
            ) : (
              <span className="block truncate text-sm text-muted-foreground">No reviews yet</span>
            )}
          </div>
          <span className="flex shrink-0 items-center gap-1 text-[11px] font-bold uppercase tracking-[0.08em] text-primary">
            Visit shop
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  );
}
