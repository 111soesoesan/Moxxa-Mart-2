"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useCartContext } from "@/context/CartContext";
import { cartLineKey } from "@/hooks/useCart";
import { groupCartItemsByShop } from "@/lib/cart-utils";
import { formatCurrency } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";

type Props = { open: boolean; onClose: () => void };

export function CartDrawer({ open, onClose }: Props) {
  const { cart, itemCount, subtotal, updateQuantity, removeItem } = useCartContext();

  const groups = useMemo(() => groupCartItemsByShop(cart.items), [cart.items]);
  const shopCount = groups.length;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="flex flex-col w-full p-0 sm:max-w-md">
        <SheetHeader className="px-6 py-4">
          <SheetTitle className="flex flex-wrap items-center gap-2">
            Cart ({itemCount})
            {shopCount > 1 && (
              <Badge variant="secondary" className="font-normal text-xs">
                {shopCount} sellers
              </Badge>
            )}
          </SheetTitle>
          {shopCount > 1 && (
            <p className="text-xs text-muted-foreground text-left font-normal">
              Checkout splits payment by shop—each seller is paid separately.
            </p>
          )}
        </SheetHeader>

        {cart.items.length === 0 ? (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            Your cart is empty
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1">
              <div className="px-6 h-full">
              <div className="space-y-6 py-2">
                {groups.map(({ shopId, items }) => {
                  const label =
                    items[0]?.shop_name ??
                    items.find((i) => i.shop_id === shopId)?.shop_name ??
                    "Seller";
                  const slug = items[0]?.shop_slug;
                  return (
                    <div key={shopId} className="space-y-3">
                      <div className="flex items-center justify-between gap-2 sticky top-0 bg-background/95 backdrop-blur-sm py-1.5 z-[1] border-b border-border/60 px-1">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground truncate">
                          {label}
                        </p>
                        {slug && (
                          <Link
                            href={`/shop/${slug}`}
                            className="text-xs text-primary shrink-0 hover:underline"
                            onClick={onClose}
                          >
                            Shop
                          </Link>
                        )}
                      </div>
                      <div className="space-y-4">
                        {items.map((item) => (
                          <div key={cartLineKey(item)} className="flex gap-3">
                            <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-muted shrink-0">
                              {item.image_url ? (
                                <Image
                                  src={item.image_url}
                                  alt={item.name}
                                  fill
                                  className="object-cover"
                                  sizes="64px"
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center text-2xl">📦</div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm line-clamp-1">{item.name}</p>
                              {item.variant && (
                                <p className="text-xs text-muted-foreground">
                                  {Object.entries(item.variant)
                                    .map(([k, v]) => `${k}: ${v}`)
                                    .join(", ")}
                                </p>
                              )}
                              <p className="text-sm font-semibold text-primary">{formatCurrency(item.price)}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateQuantity(item.product_id, item.quantity - 1, {
                                      variant: item.variant,
                                      variation_id: item.variation_id,
                                    })
                                  }
                                  className="w-6 h-6 rounded border text-sm hover:bg-muted"
                                >
                                  −
                                </button>
                                <span className="text-sm w-6 text-center">{item.quantity}</span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateQuantity(item.product_id, item.quantity + 1, {
                                      variant: item.variant,
                                      variation_id: item.variation_id,
                                    })
                                  }
                                  className="w-6 h-6 rounded border text-sm hover:bg-muted"
                                >
                                  +
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    removeItem(item.product_id, {
                                      variant: item.variant,
                                      variation_id: item.variation_id,
                                    })
                                  }
                                  className="ml-auto text-xs text-destructive hover:underline"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </ScrollArea>
            <Separator />
            <SheetFooter className="flex-col gap-3 px-6 py-6 sm:flex-col">
              <div className="flex justify-between font-semibold text-base">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <Button asChild className="h-10 min-h-10 w-full" onClick={onClose}>
                <Link href="/checkout">Proceed to checkout</Link>
              </Button>
              <Button variant="outline" className="h-10 min-h-10 w-full" onClick={onClose}>
                Continue shopping
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
