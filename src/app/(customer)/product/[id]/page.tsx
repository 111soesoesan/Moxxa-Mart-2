"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getProductById } from "@/actions/products";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
  VariationSelector,
  findMatchingVariation,
  minSellablePrice,
  variationAttributeAxes,
  variationIsPurchasable,
  type PDPVariation,
} from "@/components/shared/VariationSelector";
import { useCartContext } from "@/context/CartContext";
import { cn, formatCurrency } from "@/lib/utils";
import { effectiveVariationUnitPrice } from "@/lib/product-pricing";
import { ShoppingCart, Store, AlertCircle, CheckCircle, Truck, BadgeCheck } from "lucide-react";
import { CONDITIONS } from "@/lib/constants";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductRatingSection } from "@/components/ratings/ProductRatingSection";

type Product = NonNullable<Awaited<ReturnType<typeof getProductById>>>;

function inventoryAvailability(inv: unknown): { available: number; physical: number } | null {
  if (inv == null) return null;
  const row = Array.isArray(inv) ? inv[0] : inv;
  if (!row || typeof row !== "object" || !("stock_quantity" in row)) return null;
  const o = row as { stock_quantity: number; reserved_quantity?: number };
  const physical = Number(o.stock_quantity ?? 0);
  const reserved = Number(o.reserved_quantity ?? 0);
  return { physical, available: Math.max(0, physical - reserved) };
}

function normalizeVariations(raw: Product["product_variations"]): PDPVariation[] {
  const rows = (raw ?? []) as Array<{
    id: string;
    attribute_combination: unknown;
    price: number | null;
    sale_price: number | null;
    stock_quantity: number;
    image_url: string | null;
    is_active: boolean;
    track_inventory?: boolean | null;
    inventory?: unknown;
  }>;
  return rows.map((v) => {
    const fromInv = inventoryAvailability(v.inventory);
    return {
      id: v.id,
      attribute_combination: (v.attribute_combination ?? {}) as Record<string, string>,
      price: v.price,
      sale_price: v.sale_price,
      stock_quantity: v.stock_quantity,
      available_quantity: fromInv?.available ?? v.stock_quantity,
      image_url: v.image_url,
      is_active: v.is_active,
      track_inventory: v.track_inventory,
    };
  });
}

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
  const { addItem } = useCartContext();
  const router = useRouter();

  useEffect(() => {
    getProductById(id).then((p) => {
      setProduct(p);
      setLoading(false);
      setSelectedAttributes({});
      setSelectedImage(0);
      setQuantity(1);
    });
  }, [id]);

  const isVariable = product?.product_type === "variable";
  const variations = product ? normalizeVariations(product.product_variations) : [];
  const axes = isVariable ? variationAttributeAxes(variations) : [];
  const resolvedVariation =
    isVariable && product
      ? findMatchingVariation(variations, axes, selectedAttributes)
      : null;
  const purchasable =
    isVariable && resolvedVariation
      ? variationIsPurchasable(resolvedVariation, product.track_inventory)
      : !isVariable && product
        ? !product.track_inventory || product.stock > 0
        : false;

  // Clamp qty when the selected variation or its stock changes (narrow deps avoid extra runs)
  useEffect(() => {
    if (!isVariable || !product || !resolvedVariation) return;
    if (!variationIsPurchasable(resolvedVariation, product.track_inventory)) return;
    const enforce =
      product.track_inventory && resolvedVariation.track_inventory !== false;
    const max = enforce
      ? resolvedVariation.available_quantity ?? resolvedVariation.stock_quantity
      : 9999;
    queueMicrotask(() => {
      setQuantity((q) => Math.max(1, Math.min(q, max)));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- product.id + variation id/stock identify the purchasable line
  }, [
    isVariable,
    product?.id,
    product?.track_inventory,
    resolvedVariation?.id,
    resolvedVariation?.stock_quantity,
    resolvedVariation?.available_quantity,
    resolvedVariation?.track_inventory,
  ]);

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/20">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
            <Skeleton className="aspect-square rounded-2xl" />
            <div className="space-y-5">
              <Skeleton className="h-3 w-48" />
              <Skeleton className="h-10 w-full max-w-md" />
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-24 w-full max-w-lg" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">Product not found.</div>
    );
  }

  const shop = product.shops as {
    id: string;
    name: string;
    slug: string;
    logo_url?: string | null;
    profile_image_url?: string | null;
    allow_guest_purchase?: boolean;
  } | null;

  const handleSelectAttribute = (axis: string, value: string) => {
    setSelectedAttributes((prev) => ({ ...prev, [axis]: value }));
  };

  const handleAddToCart = () => {
    if (!shop) return;
    if (isVariable) {
      if (!resolvedVariation || !variationIsPurchasable(resolvedVariation, product.track_inventory)) {
        toast.error("Choose an available option.");
        return;
      }
      addItem({
        product_id: product.id,
        shop_id: product.shop_id,
        shop_name: shop.name,
        shop_slug: shop.slug,
        name: product.name,
        price: effectiveVariationUnitPrice(resolvedVariation),
        quantity,
        variation_id: resolvedVariation.id,
        variant: { ...resolvedVariation.attribute_combination },
        image_url: resolvedVariation.image_url ?? product.image_urls?.[0],
      });
    } else {
      addItem({
        product_id: product.id,
        shop_id: product.shop_id,
        shop_name: shop.name,
        shop_slug: shop.slug,
        name: product.name,
        price: product.price,
        quantity,
        image_url: product.image_urls?.[0],
      });
    }
    toast.success("Added to cart!");
  };

  const handleBuyNow = () => {
    handleAddToCart();
    router.push("/checkout");
  };

  const minFrom = isVariable ? minSellablePrice(variations, product.track_inventory) : null;
  const displayUnitPrice = isVariable
    ? resolvedVariation
      ? effectiveVariationUnitPrice(resolvedVariation)
      : minFrom ?? 0
    : Number(product.price);

  const heroUrl =
    isVariable && resolvedVariation?.image_url
      ? resolvedVariation.image_url
      : product.image_urls?.[selectedImage];

  const stockLabelSimple = product.track_inventory ? product.stock : null;
  const resolvedTracksStock =
    !!resolvedVariation &&
    product.track_inventory &&
    resolvedVariation.track_inventory !== false;
  const stockLabelVariable =
    isVariable && resolvedVariation && resolvedTracksStock
      ? resolvedVariation.available_quantity ?? resolvedVariation.stock_quantity
      : null;

  const showPurchaseBlock = isVariable ? purchasable : product.stock > 0 || !product.track_inventory;

  const conditionLabel = CONDITIONS.find((c) => c.value === product.condition)?.label;

  return (
    <div className="min-h-screen bg-muted/20">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16 xl:gap-20">
          <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted shadow-sm">
              {heroUrl ? (
                <Image
                  src={heroUrl}
                  alt={product.name}
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-6xl">📦</div>
              )}
            </div>
            {product.image_urls && product.image_urls.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-1">
                {product.image_urls.map((url, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedImage(i)}
                    className={cn(
                      "relative size-20 shrink-0 overflow-hidden rounded-xl border-2 transition-all",
                      selectedImage === i ? "border-foreground ring-2 ring-primary/20" : "border-transparent opacity-80 hover:opacity-100"
                    )}
                  >
                    <Image src={url} alt={`View ${i + 1}`} fill className="object-cover" sizes="80px" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-6 lg:max-w-xl lg:justify-center lg:pt-2">
            {(product.category || conditionLabel) && (
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {product.category && (
                  <Link
                    href={`/products?category=${encodeURIComponent(product.category)}`}
                    className="hover:text-foreground"
                  >
                    {product.category}
                  </Link>
                )}
                {product.category && conditionLabel && <span className="mx-2 text-muted-foreground/60">—</span>}
                {conditionLabel}
              </p>
            )}

            <div className="space-y-4">
              <h1 className="text-3xl font-bold leading-[1.15] tracking-tight text-foreground sm:text-4xl">
                {product.name}
              </h1>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge type="condition" value={product.condition} />
                {product.category && (
                  <Badge variant="outline" className="font-normal">
                    {product.category}
                  </Badge>
                )}
              </div>
            </div>

            <ProductRatingSection
              productId={product.id}
              ratingAvg={product.rating_avg}
              ratingCount={product.rating_count}
              signInNextPath={`/product/${product.id}`}
            />

            <p className="text-2xl font-semibold tracking-tight text-primary sm:text-3xl">
              {isVariable && !resolvedVariation && minFrom != null && minFrom > 0 ? (
                <>From {formatCurrency(minFrom)}</>
              ) : (
                formatCurrency(displayUnitPrice)
              )}
            </p>

            {product.description && (
              <p className="max-w-prose text-[15px] leading-relaxed text-muted-foreground">{product.description}</p>
            )}

            {isVariable && axes.length > 0 && (
              <VariationSelector
                variations={variations}
                productTrackInventory={product.track_inventory}
                axes={axes}
                selected={selectedAttributes}
                onSelect={handleSelectAttribute}
              />
            )}

            <div className="space-y-2">
            {isVariable ? (
              !minFrom || minFrom <= 0 ? (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
                  <div>
                    <p className="font-medium text-red-900">Out of Stock</p>
                    <p className="text-sm text-red-700">No options available right now</p>
                  </div>
                </div>
              ) : resolvedVariation && !variationIsPurchasable(resolvedVariation, product.track_inventory) ? (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
                  <div>
                    <p className="font-medium text-red-900">Unavailable</p>
                    <p className="text-sm text-red-700">This combination is not available</p>
                  </div>
                </div>
              ) : purchasable ? (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                  <div>
                    <p className="font-medium text-green-900">In Stock</p>
                    {resolvedTracksStock && stockLabelVariable != null && (
                      <p className="text-sm text-green-700">
                        {stockLabelVariable <= 5
                          ? `Only ${stockLabelVariable} left`
                          : `${stockLabelVariable} available`}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 bg-muted border rounded-lg">
                  <p className="text-sm text-muted-foreground">Select all options to see availability and price.</p>
                </div>
              )
            ) : product.stock > 0 || !product.track_inventory ? (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                <div>
                  <p className="font-medium text-green-900">In Stock</p>
                  {product.track_inventory && stockLabelSimple != null && (
                    <p className="text-sm text-green-700">
                      {stockLabelSimple <= 5
                        ? `Only ${stockLabelSimple} left`
                        : `${stockLabelSimple} available`}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
                <div>
                  <p className="font-medium text-red-900">Out of Stock</p>
                  <p className="text-sm text-red-700">Currently unavailable</p>
                </div>
              </div>
            )}
          </div>

          {showPurchaseBlock && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Quantity</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  >
                    −
                  </Button>
                  <span className="min-w-8 text-center font-semibold tabular-nums">{quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => {
                      if (isVariable && resolvedVariation && resolvedTracksStock) {
                        const cap =
                          resolvedVariation.available_quantity ?? resolvedVariation.stock_quantity;
                        setQuantity(Math.min(cap, quantity + 1));
                      } else if (!isVariable && product.track_inventory) {
                        setQuantity(Math.min(product.stock, quantity + 1));
                      } else {
                        setQuantity(quantity + 1);
                      }
                    }}
                  >
                    +
                  </Button>
                </div>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button size="lg" className="h-12 flex-1 font-semibold" onClick={handleAddToCart}>
                  <ShoppingCart className="mr-2 size-4" />
                  Add to cart
                </Button>
                <Button size="lg" variant="outline" className="h-12 flex-1 font-semibold" onClick={handleBuyNow}>
                  Buy now
                </Button>
              </div>
            </div>
          )}

          {shop && (
            <div className="space-y-4 border-t border-border/60 pt-6">
              {shop.allow_guest_purchase && (
                <div className="flex gap-3 text-sm text-muted-foreground">
                  <Truck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                  <p>Guest checkout is available for this shop when you don&apos;t want to create an account.</p>
                </div>
              )}
              <div className="flex gap-3 text-sm text-muted-foreground">
                <BadgeCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                <p>Purchases are fulfilled by the seller. Use ratings and order history to track your experience.</p>
              </div>
              <Separator className="opacity-50" />
              <Link href={`/shop/${shop.slug}`} className="group flex items-center gap-3">
                <Avatar className="size-11 border border-border/60">
                  <AvatarImage src={(shop.profile_image_url ?? shop.logo_url) ?? undefined} />
                  <AvatarFallback>
                    <Store className="size-4" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Sold by</p>
                  <p className="font-semibold transition-colors group-hover:text-primary">{shop.name}</p>
                </div>
              </Link>
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
