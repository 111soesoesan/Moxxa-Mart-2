"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useCartContext } from "@/context/CartContext";
import { createOrder, validateCart } from "@/actions/orders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert } from "@/components/ui/alert";
import { Field, FieldLabel, FieldControl, FieldError, FieldDescription } from "@/components/ui/field";
import { formatCurrency } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { ShoppingBag, AlertTriangle } from "lucide-react";

const schema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  phone: z.string().min(1, "Phone number is required"),
  email: z.union([z.string().email("Enter a valid email"), z.literal("")]).optional(),
  address: z.string().min(10, "Please enter your complete delivery address"),
  notes: z.string().optional(),
});

type CheckoutSchema = z.infer<typeof schema>;

export default function CheckoutPage() {
  const { cart, subtotal, clearCart } = useCartContext();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [validationIssues, setValidationIssues] = useState<string[]>([]);

  const form = useForm<CheckoutSchema>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: "",
      phone: "",
      email: "",
      address: "",
      notes: "",
    },
  });

  const errors = form.formState.errors;
  const rootError = errors.root?.message;

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

  const onSubmit = (values: CheckoutSchema) => {
    setValidationIssues([]);

    startTransition(async () => {
      const validation = await validateCart(cart.items);
      if (!validation.valid) {
        const messages = validation.issues.map((issue) => {
          if (issue.type === "price_changed")
            return `"${issue.name}" price changed from ${formatCurrency(issue.oldPrice!)} to ${formatCurrency(issue.newPrice!)}.`;
          if (issue.type === "out_of_stock")
            return `"${issue.name}" is out of stock.`;
          if (issue.type === "insufficient_stock")
            return `"${issue.name}" only has ${issue.availableStock} left (you have ${issue.requestedQty}).`;
          return `"${issue.name}" is no longer available.`;
        });
        setValidationIssues(messages);
        return;
      }

      const result = await createOrder({
        shop_id: cart.shop_id!,
        items: cart.items,
        customer: {
          full_name: values.full_name,
          phone: values.phone,
          address: values.address,
          email: values.email || undefined,
        },
        notes: values.notes || undefined,
      });

      // Guard against undefined data to satisfy strict typing
      if (!result.data) {
        form.setError("root", { message: result.error ?? "Failed to create order" });
        return;
      }

      clearCart();
      toast.success("Order placed! Please submit payment proof.");
      router.push(`/orders/${result.data.id}`);
    });
  };

  return (
    <div className="container mx-auto px-4 py-10 max-w-4xl">
      <h1 className="text-2xl font-bold mb-8">Checkout</h1>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Your Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {rootError && <Alert variant="destructive">{rootError}</Alert>}
                {validationIssues.length > 0 && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4 mb-1" />
                    <p className="font-medium mb-1">Your cart has changed — please review:</p>
                    <ul className="text-sm list-disc list-inside space-y-0.5">
                      {validationIssues.map((msg, i) => <li key={i}>{msg}</li>)}
                    </ul>
                    <p className="text-sm mt-2">Update your cart and try again.</p>
                  </Alert>
                )}

                <Field error={errors.full_name?.message}>
                  <FieldLabel required>Full Name</FieldLabel>
                  <FieldControl>
                    <Input
                      placeholder="Juan dela Cruz"
                      autoComplete="name"
                      {...form.register("full_name")}
                    />
                  </FieldControl>
                  <FieldError />
                </Field>

                <Field error={errors.phone?.message}>
                  <FieldLabel required>Phone Number</FieldLabel>
                  <FieldControl>
                    <Input
                      type="tel"
                      placeholder="09XX XXX XXXX"
                      autoComplete="tel"
                      {...form.register("phone")}
                    />
                  </FieldControl>
                  <FieldError />
                </Field>

                <Field error={errors.email?.message}>
                  <FieldLabel>Email</FieldLabel>
                  <FieldControl>
                    <Input
                      type="email"
                      placeholder="for order updates"
                      autoComplete="email"
                      {...form.register("email")}
                    />
                  </FieldControl>
                  <FieldDescription>Optional — we'll send order updates here.</FieldDescription>
                  <FieldError />
                </Field>

                <Field error={errors.address?.message}>
                  <FieldLabel required>Delivery Address</FieldLabel>
                  <FieldControl>
                    <Textarea
                      placeholder="House no., Street, Barangay, City/Municipality, Province"
                      rows={3}
                      autoComplete="street-address"
                      {...form.register("address")}
                    />
                  </FieldControl>
                  <FieldError />
                </Field>

                <Field error={errors.notes?.message}>
                  <FieldLabel>Order Notes</FieldLabel>
                  <FieldControl>
                    <Textarea
                      placeholder="Special instructions for the vendor"
                      rows={2}
                      {...form.register("notes")}
                    />
                  </FieldControl>
                  <FieldDescription>Optional — share any special requests.</FieldDescription>
                  <FieldError />
                </Field>
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
                      ) : (
                        <div className="flex h-full items-center justify-center">📦</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-1">{item.name}</p>
                      <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                    </div>
                    <p className="text-sm font-semibold shrink-0">
                      {formatCurrency(item.price * item.quantity)}
                    </p>
                  </div>
                ))}
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span className="text-primary">{formatCurrency(subtotal)}</span>
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
