"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCartContext } from "@/context/CartContext";
import { cartLineKey } from "@/hooks/useCart";
import { formatCurrency } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";

type Props = { open: boolean; onClose: () => void };

export function CartDrawer({ open, onClose }: Props) {
  const { cart, itemCount, subtotal, updateQuantity, removeItem } = useCartContext();

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="flex flex-col w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Cart ({itemCount})</SheetTitle>
        </SheetHeader>

        {cart.items.length === 0 ? (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            Your cart is empty
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-4 py-2">
                {cart.items.map((item) => (
                  <div key={cartLineKey(item)} className="flex gap-3">
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-muted shrink-0">
                      {item.image_url ? (
                        <Image src={item.image_url} alt={item.name} fill className="object-cover" sizes="64px" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-2xl">📦</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm line-clamp-1">{item.name}</p>
                      {item.variant && (
                        <p className="text-xs text-muted-foreground">
                          {Object.entries(item.variant).map(([k, v]) => `${k}: ${v}`).join(", ")}
                        </p>
                      )}
                      <p className="text-sm font-semibold text-primary">{formatCurrency(item.price)}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <button
                          onClick={() =>
                            updateQuantity(item.product_id, item.quantity - 1, {
                              variant: item.variant,
                              variation_id: item.variation_id,
                            })
                          }
                          className="w-6 h-6 rounded border text-sm hover:bg-muted"
                        >−</button>
                        <span className="text-sm w-6 text-center">{item.quantity}</span>
                        <button
                          onClick={() =>
                            updateQuantity(item.product_id, item.quantity + 1, {
                              variant: item.variant,
                              variation_id: item.variation_id,
                            })
                          }
                          className="w-6 h-6 rounded border text-sm hover:bg-muted"
                        >+</button>
                        <button
                          onClick={() =>
                            removeItem(item.product_id, {
                              variant: item.variant,
                              variation_id: item.variation_id,
                            })
                          }
                          className="ml-auto text-xs text-destructive hover:underline"
                        >Remove</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <Separator />
            <SheetFooter className="flex-col gap-3 sm:flex-col">
              <div className="flex justify-between font-semibold text-base">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <Button asChild className="w-full" onClick={onClose}>
                <Link href="/checkout">Proceed to Checkout</Link>
              </Button>
              <Button variant="outline" className="w-full" onClick={onClose}>
                Continue Shopping
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
