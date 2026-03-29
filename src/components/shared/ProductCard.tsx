import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { StarSummary } from "@/components/ratings/StarRating";
import { type CatalogProductBase } from "@/lib/product-pricing";
import { StatusBadge } from "./StatusBadge";
import { formatCurrency } from "@/lib/utils";

type Product = CatalogProductBase & {
  display_price: number;
  display_in_stock: boolean;
  rating_avg?: number | null;
  rating_count?: number | null;
  shops?: { name: string; slug: string } | null;
};

export function ProductCard({ product }: { product: Product }) {
  const image = product.image_urls?.[0];
  const shop = product.shops;
  const listPrice = product.display_price ?? product.price;
  const inStock = product.display_in_stock ?? product.stock > 0;
  const isVariable = product.product_type === "variable";

  return (
    <Link href={`/product/${product.id}`}>
      <Card className="group overflow-hidden hover:shadow-md transition-shadow h-full">
        <div className="aspect-square relative bg-muted overflow-hidden">
          {image ? (
            <Image
              src={image}
              alt={product.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground text-4xl">📦</div>
          )}
          {!inStock && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white font-semibold text-sm">Out of Stock</span>
            </div>
          )}
        </div>
        <CardContent className="p-3 space-y-1.5">
          <p className="font-semibold text-sm line-clamp-2 leading-snug">{product.name}</p>
          <StarSummary avg={product.rating_avg ?? null} count={product.rating_count ?? 0} className="text-xs" />
          <p className="text-lg font-bold text-primary">
            {isVariable && listPrice > 0 ? (
              <>From {formatCurrency(listPrice)}</>
            ) : (
              formatCurrency(listPrice)
            )}
          </p>
          <div className="flex items-center gap-1.5 flex-wrap">
            <StatusBadge type="condition" value={product.condition} />
          </div>
          {shop && (
            <p className="text-xs text-muted-foreground truncate">
              Sold by <span className="font-medium">{shop.name}</span>
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
