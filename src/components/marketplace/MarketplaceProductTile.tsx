"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCartContext } from "@/context/CartContext";
import { cartLineKey, type CartItem } from "@/hooks/useCart";
import { CONDITIONS } from "@/lib/constants";
import {
  effectiveSimpleUnitPrice,
  effectiveVariationUnitPrice,
  type CatalogProductBase,
  type CatalogVariationRow,
} from "@/lib/product-pricing";
import { cn, formatCurrency } from "@/lib/utils";
import {
  VariationSelector,
  findMatchingVariation,
  variationAttributeAxes,
  variationIsPurchasable,
  type PDPVariation,
} from "@/components/shared/VariationSelector";
import {
  toMarketplaceProductTileData,
  type MarketplaceProductTileData,
  type EnrichedCatalogRow,
} from "@/lib/marketplace-utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Package, ShoppingCart, Star, Tag } from "lucide-react";
import { toast } from "sonner";


function lineQuantity(
  items: CartItem[],
  productId: string,
  opts?: { variation_id?: string | null; variant?: Record<string, string> }
): number {
  const key = cartLineKey({
    product_id: productId,
    variation_id: opts?.variation_id,
    variant: opts?.variant,
  });
  return items.find((i) => cartLineKey(i) === key)?.quantity ?? 0;
}

function toPDPVariations(rows: CatalogVariationRow[]): PDPVariation[] {
  return rows.map((v) => ({
    id: v.id,
    attribute_combination:
      v.attribute_combination && typeof v.attribute_combination === "object"
        ? (v.attribute_combination as Record<string, string>)
        : {},
    price: v.price,
    sale_price: v.sale_price,
    stock_quantity: v.stock_quantity,
    available_quantity: v.stock_quantity,
    image_url: null,
    is_active: v.is_active,
    track_inventory: v.track_inventory,
  }));
}

function defaultVariationSelection(
  variations: PDPVariation[],
  productTrackInventory: boolean
): Record<string, string> {
  const first = variations.find((v) => variationIsPurchasable(v, productTrackInventory));
  if (!first) return {};
  return { ...first.attribute_combination };
}

function isNewListing(createdAt: string, days = 14) {
  const t = new Date(createdAt).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t < days * 24 * 60 * 60 * 1000;
}

function conditionLabel(value: string) {
  return CONDITIONS.find((c) => c.value === value)?.label ?? value;
}

export function MarketplaceProductTile({ product }: { product: MarketplaceProductTileData }) {
  const { addItem, cart } = useCartContext();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAttrs, setSelectedAttrs] = useState<Record<string, string>>({});
  const [dialogQty, setDialogQty] = useState(1);

  const isVariable = product.product_type === "variable";
  const variations = useMemo(() => toPDPVariations(product.product_variations), [product.product_variations]);
  const axes = useMemo(
    () => (isVariable ? variationAttributeAxes(variations) : []),
    [isVariable, variations]
  );
  const resolvedVariation =
    isVariable && axes.length
      ? findMatchingVariation(variations, axes, selectedAttrs)
      : null;

  const anyVariationPurchasable = useMemo(
    () => variations.some((v) => variationIsPurchasable(v, product.track_inventory)),
    [variations, product.track_inventory]
  );

  const simpleUnit = useMemo(
    () => effectiveSimpleUnitPrice({ price: product.price, sale_price: product.sale_price }),
    [product.price, product.sale_price]
  );

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

  const cartCanAttempt = isVariable ? anyVariationPurchasable : product.display_in_stock;

  useEffect(() => {
    if (!dialogOpen || !isVariable) return;
    setSelectedAttrs(defaultVariationSelection(variations, product.track_inventory));
    setDialogQty(1);
  }, [dialogOpen, isVariable, product.track_inventory, variations]);

  useEffect(() => {
    if (!dialogOpen || !isVariable || !resolvedVariation || !variationIsPurchasable(resolvedVariation, product.track_inventory)) {
      return;
    }
    const enforce = product.track_inventory && resolvedVariation.track_inventory !== false;
    const avail = resolvedVariation.available_quantity ?? resolvedVariation.stock_quantity;
    const existing = lineQuantity(cart.items, product.id, {
      variation_id: resolvedVariation.id,
      variant: resolvedVariation.attribute_combination,
    });
    const max = enforce ? Math.max(0, avail - existing) : 9999;
    setDialogQty((q) => Math.max(1, Math.min(q, Math.max(1, max))));
  }, [
    dialogOpen,
    isVariable,
    resolvedVariation,
    product.track_inventory,
    product.id,
    cart.items,
  ]);

  const maxDialogQty = useMemo(() => {
    if (!isVariable || !resolvedVariation || !variationIsPurchasable(resolvedVariation, product.track_inventory)) {
      return 9999;
    }
    const enforce = product.track_inventory && resolvedVariation.track_inventory !== false;
    if (!enforce) return 9999;
    const avail = resolvedVariation.available_quantity ?? resolvedVariation.stock_quantity;
    const existing = lineQuantity(cart.items, product.id, {
      variation_id: resolvedVariation.id,
      variant: resolvedVariation.attribute_combination,
    });
    return Math.max(0, avail - existing);
  }, [isVariable, resolvedVariation, product.track_inventory, product.id, cart.items]);

  const handleSelectAxis = useCallback((axis: string, value: string) => {
    setSelectedAttrs((prev) => ({ ...prev, [axis]: value }));
  }, []);

  const handleCartClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!cartCanAttempt) {
      toast.error("This item is not available to add.");
      return;
    }
    if (!product.shop_slug) {
      toast.error("Shop information missing.");
      return;
    }

    if (isVariable) {
      setDialogOpen(true);
      return;
    }

    const existing = lineQuantity(cart.items, product.id);
    const maxAdd = product.track_inventory ? Math.max(0, product.stock - existing) : 9999;
    if (maxAdd < 1) {
      toast.error("No more stock available for this product.");
      return;
    }

    addItem({
      product_id: product.id,
      shop_id: product.shop_id,
      shop_name: product.shop_name ?? undefined,
      shop_slug: product.shop_slug,
      name: product.name,
      price: simpleUnit,
      quantity: 1,
      image_url: product.image_urls?.[0],
    });
    toast.success("Added to cart");
  };

  const handleDialogAdd = () => {
    if (!product.shop_slug) {
      toast.error("Shop information missing.");
      return;
    }
    if (!resolvedVariation || !variationIsPurchasable(resolvedVariation, product.track_inventory)) {
      toast.error("Choose an available option.");
      return;
    }
    const existing = lineQuantity(cart.items, product.id, {
      variation_id: resolvedVariation.id,
      variant: resolvedVariation.attribute_combination,
    });
    const enforce = product.track_inventory && resolvedVariation.track_inventory !== false;
    const avail = resolvedVariation.available_quantity ?? resolvedVariation.stock_quantity;
    const max = enforce ? avail - existing : 9999;
    if (dialogQty > max) {
      toast.error(`You can add at most ${Math.max(0, max)} more (stock limit).`);
      return;
    }
    if (dialogQty < 1 || max < 1) {
      toast.error("No more stock available for this option.");
      return;
    }

    addItem({
      product_id: product.id,
      shop_id: product.shop_id,
      shop_name: product.shop_name ?? undefined,
      shop_slug: product.shop_slug,
      name: product.name,
      price: effectiveVariationUnitPrice(resolvedVariation),
      quantity: dialogQty,
      variation_id: resolvedVariation.id,
      variant: { ...resolvedVariation.attribute_combination },
      image_url: product.image_urls?.[0],
    });
    toast.success("Added to cart");
    setDialogOpen(false);
  };

  const ratingBlock =
    product.rating_count > 0 && product.rating_avg != null ? (
      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        <Star className="h-3.5 w-3.5 fill-primary text-primary shrink-0" aria-hidden />
        <span className="font-semibold text-foreground tabular-nums">{Number(product.rating_avg).toFixed(1)}</span>
        <span className="text-muted-foreground">({product.rating_count})</span>
      </p>
    ) : (
      <p className="text-xs text-muted-foreground">No reviews yet</p>
    );

  return (
    <>
      <div className="group flex h-full flex-col gap-2.5 sm:gap-3 rounded-2xl outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background p-2">
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted">
          <Link href={`/product/${product.id}`} className="absolute inset-0 z-0 block">
            {product.image_urls?.[0] ? (
              <Image
                src={product.image_urls[0]}
                alt={product.name}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 20vw, 14vw"
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-muted text-2xl text-muted-foreground/35">
                📦
              </div>
            )}
          </Link>
          <button
            type="button"
            onClick={handleCartClick}
            disabled={!cartCanAttempt}
            className={cn(
              "absolute right-2 top-2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-background/95 text-primary shadow-md backdrop-blur-sm transition-all duration-300 hover:bg-primary hover:text-primary-foreground hover:scale-110 active:scale-95 hover:shadow-lg",
              !cartCanAttempt && "pointer-events-none opacity-40"
            )}
            aria-label={isVariable ? "Choose options and add to cart" : "Add to cart"}
          >
            <ShoppingCart className="h-5 w-5" aria-hidden />
          </button>
          {showNew && (
            <span className="pointer-events-none absolute left-2 top-2 z-[5] rounded-md bg-background/92 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-foreground shadow-sm backdrop-blur-[2px]">
              New
            </span>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1.5 px-0.5">
          <div className="flex items-start justify-between gap-2">
            <Link
              href={`/product/${product.id}`}
              className="min-w-0 flex-1 text-sm font-bold leading-snug text-foreground line-clamp-2 transition-colors hover:text-primary"
            >
              {product.name}
            </Link>
            <Link
              href={`/product/${product.id}`}
              className="shrink-0 text-sm font-bold tabular-nums text-primary"
            >
              {priceNode}
            </Link>
          </div>

          {ratingBlock}

          <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2">{metaLine}</p>

          {shop && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Package className="h-3.5 w-3.5 shrink-0 text-primary/80" aria-hidden />
              <span className="line-clamp-1">
                <span className="text-muted-foreground">Sold by </span>
                <span className="font-medium text-foreground transition-colors group-hover:text-primary">
                  {shop}
                </span>
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
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="flex max-h-[min(90dvh,640px)] flex-col gap-0 overflow-hidden border-0 bg-background p-0 shadow-xl sm:max-w-md">
          <DialogHeader className="shrink-0 border-b border-border/10 px-4 py-3 pr-12 text-left">
            <DialogTitle className="line-clamp-2 text-base font-semibold leading-snug">{product.name}</DialogTitle>
            <p className="text-sm font-semibold text-primary">
              {resolvedVariation && variationIsPurchasable(resolvedVariation, product.track_inventory)
                ? formatCurrency(effectiveVariationUnitPrice(resolvedVariation))
                : product.display_price > 0
                  ? `From ${formatCurrency(product.display_price)}`
                  : "—"}
            </p>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
            <VariationSelector
              variations={variations}
              productTrackInventory={product.track_inventory}
              axes={axes}
              selected={selectedAttrs}
              onSelect={handleSelectAxis}
            />
            {resolvedVariation && variationIsPurchasable(resolvedVariation, product.track_inventory) ? (
              <p className="text-xs text-muted-foreground">
                {product.track_inventory && resolvedVariation.track_inventory !== false ? (
                  maxDialogQty < 1 ? (
                    <>None left to add (in cart or sold out).</>
                  ) : (
                    <>{maxDialogQty} available to add.</>
                  )
                ) : (
                  "Stock not tracked for this option."
                )}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Select every option to see price and stock.</p>
            )}
            <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2">
              <span className="text-sm font-medium text-muted-foreground">Quantity</span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  disabled={dialogQty <= 1}
                  onClick={() => setDialogQty((q) => Math.max(1, q - 1))}
                  aria-label="Decrease quantity"
                >
                  −
                </Button>
                <span className="min-w-[2rem] text-center text-sm font-semibold tabular-nums">{dialogQty}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  disabled={maxDialogQty < 1 || dialogQty >= maxDialogQty}
                  onClick={() => setDialogQty((q) => q + 1)}
                  aria-label="Increase quantity"
                >
                  +
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter className="mx-0 mb-0 shrink-0 rounded-b-xl border-t border-border/10 bg-background p-4 sm:flex-col sm:gap-2 sm:space-x-0">
            <Button
              type="button"
              className="h-10 min-h-10 w-full font-semibold"
              disabled={
                !resolvedVariation ||
                !variationIsPurchasable(resolvedVariation, product.track_inventory) ||
                maxDialogQty < 1
              }
              onClick={handleDialogAdd}
            >
              Add to cart
            </Button>
            <Button type="button" variant="ghost" className="h-10 w-full" asChild>
              <Link href={`/product/${product.id}`} onClick={() => setDialogOpen(false)}>
                View full details
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
