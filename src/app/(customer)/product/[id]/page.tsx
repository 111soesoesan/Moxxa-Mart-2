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
import { formatCurrency } from "@/lib/utils";
import { effectiveVariationUnitPrice } from "@/lib/product-pricing";
import { ShoppingCart, Store, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

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
      <div className="container mx-auto px-4 py-10 grid grid-cols-1 md:grid-cols-2 gap-10">
        <Skeleton className="aspect-square rounded-xl" />
        <div className="space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-20 w-full" />
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

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="space-y-3">
          <div className="aspect-square relative rounded-xl overflow-hidden bg-muted">
            {heroUrl ? (
              <Image
                src={heroUrl}
                alt={product.name}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-6xl">📦</div>
            )}
          </div>
          {product.image_urls && product.image_urls.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {product.image_urls.map((url, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedImage(i)}
                  className={`relative w-16 h-16 shrink-0 rounded-lg overflow-hidden border-2 transition-colors ${
                    selectedImage === i ? "border-primary" : "border-transparent"
                  }`}
                >
                  <Image src={url} alt={`View ${i + 1}`} fill className="object-cover" sizes="64px" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div>
            <h1 className="text-2xl font-bold leading-tight">{product.name}</h1>
            <div className="flex items-center gap-2 mt-2">
              <StatusBadge type="condition" value={product.condition} />
              {product.category && <Badge variant="outline">{product.category}</Badge>}
            </div>
          </div>

          <p className="text-3xl font-bold text-primary">
            {isVariable && !resolvedVariation && minFrom != null && minFrom > 0 ? (
              <>From {formatCurrency(minFrom)}</>
            ) : (
              formatCurrency(displayUnitPrice)
            )}
          </p>

          {product.description && (
            <p className="text-muted-foreground leading-relaxed">{product.description}</p>
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
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">Qty:</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  >
                    −
                  </Button>
                  <span className="w-8 text-center font-medium">{quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
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
              <div className="flex gap-3">
                <Button className="flex-1" onClick={handleAddToCart}>
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Add to Cart
                </Button>
                <Button variant="outline" className="flex-1" onClick={handleBuyNow}>
                  Buy Now
                </Button>
              </div>
            </div>
          )}

          {shop && (
            <>
              <Separator />
              <Link href={`/shop/${shop.slug}`} className="flex items-center gap-3 group">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={shop.logo_url ?? undefined} />
                  <AvatarFallback>
                    <Store className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-xs text-muted-foreground">Sold by</p>
                  <p className="font-semibold group-hover:text-primary transition-colors">{shop.name}</p>
                </div>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
