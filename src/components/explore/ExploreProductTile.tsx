import Link from "next/link";
import Image from "next/image";
import { formatCurrency } from "@/lib/utils";
import { CONDITIONS } from "@/lib/constants";
import { Package, Tag } from "lucide-react";

export type ExploreProductTileData = {
  id: string;
  name: string;
  image_urls: string[];
  display_price: number;
  category: string | null;
  condition: string;
  product_type: string;
  created_at: string;
  display_in_stock: boolean;
  shop_name?: string | null;
  shop_slug?: string | null;
};

function isNewListing(createdAt: string, days = 14) {
  const t = new Date(createdAt).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t < days * 24 * 60 * 60 * 1000;
}

function conditionLabel(value: string) {
  return CONDITIONS.find((c) => c.value === value)?.label ?? value;
}

export function ExploreProductTile({ product }: { product: ExploreProductTileData }) {
  const image = product.image_urls?.[0];
  const isVariable = product.product_type === "variable";
  const showNew = isNewListing(product.created_at);
  const shop = product.shop_name?.trim();
  const category = product.category?.trim();
  const cond = conditionLabel(product.condition);

  const metaParts = [
    cond,
    category || null,
    product.display_in_stock ? "In stock" : "Out of stock",
    isVariable ? "Multiple options" : null,
  ].filter(Boolean);
  const metaLine = metaParts.join(" · ");

  const priceNode =
    isVariable && product.display_price > 0 ? (
      <>From {formatCurrency(product.display_price)}</>
    ) : (
      formatCurrency(product.display_price)
    );

  return (
    <Link
      href={`/product/${product.id}`}
      className="group flex h-full flex-col gap-2.5 sm:gap-3 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-2xl"
    >
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted">
        {image ? (
          <Image
            src={image}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 20vw, 14vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-muted text-2xl text-muted-foreground/35">📦</div>
        )}
        {showNew && (
          <span className="absolute left-2 top-2 rounded-md bg-background/92 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-foreground shadow-sm backdrop-blur-[2px]">
            New
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5 px-0.5">
        <div className="flex items-start justify-between gap-2">
          <h5 className="min-w-0 flex-1 text-sm font-bold leading-snug text-foreground line-clamp-2 transition-colors group-hover:text-primary">
            {product.name}
          </h5>
          <p className="shrink-0 text-sm font-bold tabular-nums text-primary">{priceNode}</p>
        </div>

        <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2">{metaLine}</p>

        {shop && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Package className="h-3.5 w-3.5 shrink-0 text-primary/80" aria-hidden />
            <span className="line-clamp-1">
              <span className="text-muted-foreground">Sold by </span>
              <span className="font-medium text-foreground group-hover:text-primary transition-colors">{shop}</span>
            </span>
          </div>
        )}

        <div
          className={
            product.display_in_stock
              ? "mt-0.5 inline-flex w-fit max-w-full items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary"
              : "mt-0.5 inline-flex w-fit max-w-full items-center gap-1 rounded-md bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground"
          }
        >
          <Tag className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
          <span className="line-clamp-1">
            {product.display_in_stock ? "Available to order" : "Currently unavailable"}
          </span>
        </div>
      </div>
    </Link>
  );
}
