"use client";

import { useState, useTransition, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useCartContext } from "@/context/CartContext";
import { placeMultiShopOrders, validateCart } from "@/actions/orders";
import { getMyProfileForCheckout } from "@/actions/profile";
import { getShopPaymentMethodsForCustomers } from "@/actions/paymentMethods";
import { getCheckoutShopSummaries } from "@/actions/shops";
import { groupCartItemsByShop, shopSubtotal } from "@/lib/cart-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field, FieldLabel, FieldControl, FieldError, FieldDescription } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { ShoppingBag, AlertTriangle, Store } from "lucide-react";

const schema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  phone: z.string().min(1, "Phone number is required"),
  email: z.union([z.string().email("Enter a valid email"), z.literal("")]).optional(),
  address: z.string().min(10, "Please enter your complete delivery address"),
  notes: z.string().optional(),
});

type CheckoutSchema = z.infer<typeof schema>;

type PaymentMethod = {
  id: string;
  name: string;
  type: string;
  description: string | null;
  bank_name: string | null;
  account_holder: string | null;
  account_number: string | null;
  proof_required: boolean;
  is_active: boolean;
};

type ShopSummaryRow = { id: string; name: string; slug: string; logo_url: string | null };

export default function CheckoutPage() {
  const { cart, subtotal, clearCart } = useCartContext();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [validationIssues, setValidationIssues] = useState<string[]>([]);
  const [paymentMethodsByShop, setPaymentMethodsByShop] = useState<Record<string, PaymentMethod[]>>({});
  const [selectedPaymentByShop, setSelectedPaymentByShop] = useState<Record<string, string>>({});
  const [shopSummaries, setShopSummaries] = useState<Record<string, ShopSummaryRow>>({});
  const [loadingShops, setLoadingShops] = useState(true);

  const shopGroups = useMemo(() => groupCartItemsByShop(cart.items), [cart.items]);
  const shopIds = useMemo(() => shopGroups.map((g) => g.shopId), [shopGroups]);
  const multiVendor = shopIds.length > 1;

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

  useEffect(() => {
    if (cart.items.length === 0) return;

    let cancelled = false;
    (async () => {
      setLoadingShops(true);
      const ids = [...new Set(cart.items.map((i) => i.shop_id))];

      const summaries = await getCheckoutShopSummaries(ids);
      if (cancelled) return;

      const summaryMap: Record<string, ShopSummaryRow> = {};
      for (const s of summaries) {
        summaryMap[s.id] = s;
      }
      setShopSummaries(summaryMap);

      const methods: Record<string, PaymentMethod[]> = {};
      const selected: Record<string, string> = {};

      await Promise.all(
        ids.map(async (shopId) => {
          const res = await getShopPaymentMethodsForCustomers(shopId);
          const list = (res.data ?? []) as PaymentMethod[];
          methods[shopId] = list;
          if (list[0]?.id) selected[shopId] = list[0].id;
        })
      );

      if (cancelled) return;
      setPaymentMethodsByShop(methods);
      setSelectedPaymentByShop(selected);
      setLoadingShops(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [cart.items]);

  useEffect(() => {
    if (cart.items.length === 0) return;
    let cancelled = false;
    (async () => {
      const res = await getMyProfileForCheckout();
      if (cancelled || !res.success || !res.data) return;
      const p = res.data;
      const cur = form.getValues();
      if (!cur.full_name?.trim() && p.full_name?.trim()) {
        form.setValue("full_name", p.full_name.trim());
      }
      if (!cur.phone?.trim() && p.phone?.trim()) {
        form.setValue("phone", p.phone.trim());
      }
      if (!cur.email?.trim() && p.email?.trim()) {
        form.setValue("email", p.email.trim());
      }
      if (!cur.address?.trim() && p.default_address?.trim()) {
        form.setValue("address", p.default_address.trim());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cart.items.length, form]);

  function shopDisplayName(shopId: string): string {
    return (
      shopSummaries[shopId]?.name ??
      cart.items.find((i) => i.shop_id === shopId)?.shop_name ??
      "Seller"
    );
  }

  function selectedMethodForShop(shopId: string): PaymentMethod | undefined {
    const id = selectedPaymentByShop[shopId];
    return paymentMethodsByShop[shopId]?.find((m) => m.id === id);
  }

  if (cart.items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-lg font-medium">Your cart is empty</p>
        <Button asChild className="mt-4">
          <Link href="/explore">Continue Shopping</Link>
        </Button>
      </div>
    );
  }

  const onSubmit = (values: CheckoutSchema) => {
    setValidationIssues([]);

    for (const { shopId } of shopGroups) {
      const methods = paymentMethodsByShop[shopId] ?? [];
      if (methods.length === 0) {
        form.setError("root", {
          message: `${shopDisplayName(shopId)} has no payment methods available. Remove their items or contact the seller.`,
        });
        return;
      }
      if (!selectedPaymentByShop[shopId]) {
        form.setError("root", { message: `Select how you will pay ${shopDisplayName(shopId)}.` });
        return;
      }
    }

    startTransition(async () => {
      const validation = await validateCart(cart.items);
      if (!validation.valid) {
        const messages = validation.issues.map((issue) => {
          if (issue.type === "price_changed")
            return `"${issue.name}" price changed from ${formatCurrency(issue.oldPrice!)} to ${formatCurrency(issue.newPrice!)}.`;
          if (issue.type === "out_of_stock") return `"${issue.name}" is out of stock.`;
          if (issue.type === "insufficient_stock")
            return `"${issue.name}" only has ${issue.availableStock} left (you have ${issue.requestedQty}).`;
          return `"${issue.name}" is no longer available.`;
        });
        setValidationIssues(messages);
        return;
      }

      const result = await placeMultiShopOrders({
        customer: {
          full_name: values.full_name,
          phone: values.phone,
          address: values.address,
          email: values.email || undefined,
        },
        notes: values.notes || undefined,
        shops: shopGroups.map((g) => ({
          shop_id: g.shopId,
          payment_method_id: selectedPaymentByShop[g.shopId]!,
          items: g.items,
        })),
      });

      if ("validation" in result && result.validation) {
        const messages = result.validation.issues.map((issue) => {
          if (issue.type === "price_changed")
            return `"${issue.name}" price changed from ${formatCurrency(issue.oldPrice!)} to ${formatCurrency(issue.newPrice!)}.`;
          if (issue.type === "out_of_stock") return `"${issue.name}" is out of stock.`;
          if (issue.type === "insufficient_stock")
            return `"${issue.name}" only has ${issue.availableStock} left (you have ${issue.requestedQty}).`;
          return `"${issue.name}" is no longer available.`;
        });
        setValidationIssues(messages);
        return;
      }

      if (!("data" in result) || !result.data) {
        form.setError("root", { message: "error" in result ? result.error : "Failed to place order" });
        return;
      }

      clearCart();
      const { order_ids } = result.data;
      if (order_ids.length === 1) {
        toast.success("Order placed! Please submit payment proof if required.");
        router.push(`/orders/${order_ids[0]}`);
      } else {
        toast.success(
          `${order_ids.length} orders placed (one per seller). Complete payment for each on your orders page.`
        );
        router.push("/orders");
      }
    });
  };

  return (
    <div className="container mx-auto px-4 py-10 max-w-5xl">
      <div className="flex flex-wrap items-center gap-3 mb-8">
        <h1 className="text-2xl font-bold">Checkout</h1>
        {multiVendor && (
          <Badge variant="secondary" className="font-normal">
            {shopIds.length} sellers
          </Badge>
        )}
      </div>

      {multiVendor && (
        <Alert className="mb-6 border-primary/20 bg-primary/5">
          <Store className="h-4 w-4" />
          <p className="text-sm leading-relaxed">
            Your cart spans <strong>{shopIds.length} different shops</strong>. Each seller fulfills and gets paid
            separately—choose payment details per shop below. You will receive one order per seller.
          </p>
        </Alert>
      )}

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Your details</CardTitle>
                <CardDescription>Used for every order in this checkout.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {rootError && <Alert variant="destructive">{rootError}</Alert>}
                {validationIssues.length > 0 && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4 mb-1" />
                    <p className="font-medium mb-1">Your cart has changed — please review:</p>
                    <ul className="text-sm list-disc list-inside space-y-0.5">
                      {validationIssues.map((msg, i) => (
                        <li key={i}>{msg}</li>
                      ))}
                    </ul>
                    <p className="text-sm mt-2">Update your cart and try again.</p>
                  </Alert>
                )}

                <Field error={errors.full_name?.message}>
                  <FieldLabel required>Full name</FieldLabel>
                  <FieldControl>
                    <Input placeholder="Juan dela Cruz" autoComplete="name" {...form.register("full_name")} />
                  </FieldControl>
                  <FieldError />
                </Field>

                <Field error={errors.phone?.message}>
                  <FieldLabel required>Phone number</FieldLabel>
                  <FieldControl>
                    <Input type="tel" placeholder="09XX XXX XXXX" autoComplete="tel" {...form.register("phone")} />
                  </FieldControl>
                  <FieldError />
                </Field>

                <Field error={errors.email?.message}>
                  <FieldLabel>Email</FieldLabel>
                  <FieldControl>
                    <Input
                      type="email"
                      placeholder="For order updates"
                      autoComplete="email"
                      {...form.register("email")}
                    />
                  </FieldControl>
                  <FieldDescription>Optional — we&apos;ll send updates here.</FieldDescription>
                  <FieldError />
                </Field>

                <Field error={errors.address?.message}>
                  <FieldLabel required>Delivery address</FieldLabel>
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
                  <FieldLabel>Notes for sellers</FieldLabel>
                  <FieldControl>
                    <Textarea
                      placeholder="Special instructions (shared with each seller)"
                      rows={2}
                      {...form.register("notes")}
                    />
                  </FieldControl>
                  <FieldDescription>Optional — sent to every shop in this checkout.</FieldDescription>
                  <FieldError />
                </Field>
              </CardContent>
            </Card>

            {shopGroups.map(({ shopId, items }, idx) => {
              const methods = paymentMethodsByShop[shopId] ?? [];
              const summary = shopSummaries[shopId];
              const sub = shopSubtotal(items);
              const selectedPm = selectedMethodForShop(shopId);

              return (
                <Card key={shopId} className="overflow-hidden border-muted-foreground/15">
                  <CardHeader className="bg-muted/40 border-b space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="relative h-12 w-12 rounded-lg overflow-hidden bg-muted shrink-0 border">
                        {summary?.logo_url ? (
                          <Image src={summary.logo_url} alt="" fill className="object-cover" sizes="48px" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-muted-foreground">
                            <Store className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <CardTitle className="text-base">{shopDisplayName(shopId)}</CardTitle>
                          <Badge variant="outline" className="text-xs font-normal">
                            Seller {idx + 1} of {shopGroups.length}
                          </Badge>
                        </div>
                        {summary?.slug && (
                          <Link
                            href={`/shop/${summary.slug}`}
                            className="text-xs text-primary hover:underline mt-0.5 inline-block"
                          >
                            View shop
                          </Link>
                        )}
                        <p className="text-sm text-muted-foreground mt-1">
                          Subtotal {formatCurrency(sub)} · {items.reduce((n, i) => n + i.quantity, 0)} item(s)
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-4">
                    <div className="space-y-2 rounded-lg border bg-card p-3">
                      {items.map((item) => (
                        <div key={`${item.product_id}-${item.variation_id ?? ""}`} className="flex gap-2 text-sm">
                          <div className="relative w-10 h-10 rounded bg-muted shrink-0 overflow-hidden">
                            {item.image_url ? (
                              <Image src={item.image_url} alt="" fill className="object-cover" sizes="40px" />
                            ) : (
                              <div className="flex h-full items-center justify-center text-xs">📦</div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium line-clamp-2">{item.name}</p>
                            {item.variant && (
                              <p className="text-xs text-muted-foreground">
                                {Object.entries(item.variant)
                                  .map(([k, v]) => `${k}: ${v}`)
                                  .join(", ")}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">Qty {item.quantity}</p>
                          </div>
                          <p className="font-semibold shrink-0">{formatCurrency(item.price * item.quantity)}</p>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium">Pay this seller</p>
                      <p className="text-xs text-muted-foreground">
                        Only this shop&apos;s payment options are shown here.
                      </p>
                      <Select
                        value={selectedPaymentByShop[shopId] ?? ""}
                        onValueChange={(v) =>
                          setSelectedPaymentByShop((prev) => ({ ...prev, [shopId]: v }))
                        }
                        disabled={loadingShops || methods.length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={loadingShops ? "Loading…" : "Select payment method"} />
                        </SelectTrigger>
                        <SelectContent>
                          {methods.map((method) => (
                            <SelectItem key={method.id} value={method.id}>
                              {method.type === "cash" ? "💵" : "🏦"} {method.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {methods.length === 0 && !loadingShops && (
                        <p className="text-xs text-destructive">No active payment methods for this shop.</p>
                      )}
                    </div>

                    {selectedPm?.type === "bank" && (
                      <div className="p-3 border rounded-lg bg-blue-50 text-sm text-blue-900">
                        <p className="font-semibold mb-2">Bank transfer ({shopDisplayName(shopId)})</p>
                        {selectedPm.bank_name && (
                          <p>
                            <strong>Bank:</strong> {selectedPm.bank_name}
                          </p>
                        )}
                        {selectedPm.account_holder && (
                          <p>
                            <strong>Account holder:</strong> {selectedPm.account_holder}
                          </p>
                        )}
                        {selectedPm.account_number && (
                          <p>
                            <strong>Account number:</strong>{" "}
                            <code className="font-mono">{selectedPm.account_number}</code>
                          </p>
                        )}
                        {selectedPm.proof_required && (
                          <p className="mt-2 text-orange-800 bg-orange-100 p-2 rounded text-xs">
                            Upload proof of payment on the order page after placing your order.
                          </p>
                        )}
                      </div>
                    )}

                    {selectedPm?.type === "cash" && (
                      <p className="text-xs text-muted-foreground">
                        Pay cash when this seller fulfills your order for {shopDisplayName(shopId)}.
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Order summary</CardTitle>
                <CardDescription>Totals by seller, then combined.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {shopGroups.map(({ shopId, items }) => (
                  <div key={shopId} className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {shopDisplayName(shopId)}
                    </p>
                    {items.map((item) => (
                      <div key={`${item.product_id}-${item.variation_id ?? ""}-sum`} className="flex justify-between gap-2 text-sm">
                        <span className="text-muted-foreground line-clamp-1">
                          {item.name} × {item.quantity}
                        </span>
                        <span className="shrink-0 font-medium">{formatCurrency(item.price * item.quantity)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm font-semibold pt-1 border-t border-dashed">
                      <span>Shop subtotal</span>
                      <span>{formatCurrency(shopSubtotal(items))}</span>
                    </div>
                  </div>
                ))}
                <Separator />
                <div className="flex justify-between font-semibold text-base">
                  <span>Total (all sellers)</span>
                  <span className="text-primary">{formatCurrency(subtotal)}</span>
                </div>
              </CardContent>
            </Card>

            <Button type="submit" className="w-full" disabled={isPending || loadingShops}>
              {isPending
                ? "Placing orders…"
                : multiVendor
                  ? `Place ${shopIds.length} orders`
                  : "Place order"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
