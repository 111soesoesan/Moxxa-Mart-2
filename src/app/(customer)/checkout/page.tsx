"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useCartContext } from "@/context/CartContext";
import { createOrder } from "@/actions/orders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert } from "@/components/ui/alert";
import { formatCurrency } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { ShoppingBag } from "lucide-react";

export default function CheckoutPage() {
  const { cart, subtotal, clearCart } = useCartContext();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (cart.items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-lg font-medium">Your cart is empty</p>
        <Button asChild className="mt-4">
          <Link href="/">Continue Shopping</Link>
        </Button>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(null);

    startTransition(async () => {
      const result = await createOrder({
        shop_id: cart.shop_id!,
        items: cart.items,
        customer: {
          full_name: fd.get("full_name") as string,
          phone: fd.get("phone") as string,
          address: fd.get("address") as string,
          email: fd.get("email") as string || undefined,
        },
        notes: fd.get("notes") as string || undefined,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      clearCart();
      toast.success("Order placed! Please submit payment proof.");
      router.push(`/orders/${result.data.id}`);
    });
  };

  const total = subtotal;

  return (
    <div className="container mx-auto px-4 py-10 max-w-4xl">
      <h1 className="text-2xl font-bold mb-8">Checkout</h1>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Your Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {error && <Alert variant="destructive">{error}</Alert>}
                <div className="space-y-1.5">
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input id="full_name" name="full_name" placeholder="Juan dela Cruz" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input id="phone" name="phone" type="tel" placeholder="09XX XXX XXXX" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email (optional)</Label>
                  <Input id="email" name="email" type="email" placeholder="for order updates" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="address">Delivery Address *</Label>
                  <Textarea id="address" name="address" placeholder="House no., Street, Barangay, City/Municipality, Province" rows={3} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="notes">Order Notes (optional)</Label>
                  <Textarea id="notes" name="notes" placeholder="Special instructions for the vendor" rows={2} />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Order Summary</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {cart.items.map((item, i) => (
                  <div key={i} className="flex gap-2">
                    <div className="relative w-12 h-12 rounded bg-muted shrink-0 overflow-hidden">
                      {item.image_url ? (
                        <Image src={item.image_url} alt={item.name} fill className="object-cover" sizes="48px" />
                      ) : <div className="flex h-full items-center justify-center">📦</div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-1">{item.name}</p>
                      <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                    </div>
                    <p className="text-sm font-semibold shrink-0">{formatCurrency(item.price * item.quantity)}</p>
                  </div>
                ))}
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span className="text-primary">{formatCurrency(total)}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Payment is manual. You will receive the vendor&apos;s payment details on the order page.
                </p>
              </CardContent>
            </Card>

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Placing order…" : "Place Order"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
