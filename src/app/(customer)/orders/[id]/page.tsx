"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getOrderById, submitPaymentProof } from "@/actions/orders";
import { uploadPaymentProof } from "@/lib/supabase/storage";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCurrency, formatDate, formatVariant } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Upload,
  CheckCircle,
  Store,
  Truck,
  CreditCard,
  Info,
  CalendarDays,
  Package,
  Copy,
  Check,
} from "lucide-react";
import { PrintReceiptDialog } from "@/components/receipts/PrintReceiptDialog";
import { buildOrderReceiptData } from "@/lib/receipt/build-order-receipt-data";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

type Order = NonNullable<Awaited<ReturnType<typeof getOrderById>>>;

function DetailLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{children}</p>
  );
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [idCopied, setIdCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setIdCopied(false);
    getOrderById(id).then((o) => {
      setOrder(o as Order);
      setLoading(false);
    });
  }, [id]);

  const copyOrderId = useCallback(async (fullId: string) => {
    try {
      await navigator.clipboard.writeText(fullId);
      toast.success("Order ID copied");
      setIdCopied(true);
      window.setTimeout(() => setIdCopied(false), 2000);
    } catch {
      toast.error("Could not copy order ID");
    }
  }, []);

  const handleProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !order) return;
    setUploading(true);
    try {
      const url = await uploadPaymentProof(file, order.id);
      startTransition(async () => {
        const result = await submitPaymentProof(order.id, url);
        if (result.error) {
          toast.error(result.error);
        } else {
          toast.success("Payment proof submitted! The vendor will verify it shortly.");
          setOrder({ ...order, payment_status: "pending_verification", payment_proof_url: url });
        }
      });
    } catch {
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] bg-muted/25">
        <div className="container mx-auto max-w-5xl px-4 py-8 sm:py-10">
          <Skeleton className="mb-6 h-4 w-56" />
          <Skeleton className="mb-8 h-10 w-2/3 max-w-md" />
          <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
            <div className="space-y-6 lg:col-span-2">
              <Skeleton className="h-72 rounded-xl" />
              <Skeleton className="h-56 rounded-xl" />
            </div>
            <Skeleton className="h-96 rounded-xl lg:col-span-1" />
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-20 text-center text-muted-foreground">
        Order not found.{" "}
        <Link href="/orders" className="text-primary underline underline-offset-2">
          View my orders
        </Link>
      </div>
    );
  }

  const shop = order.shops as { name: string; slug: string; phone?: string } | null;
  const paymentMethod = order.payment_methods as {
    name: string;
    type: string;
    bank_name?: string;
    account_holder?: string;
    account_number?: string;
    proof_required: boolean;
  } | null;
  const items = order.items_snapshot as Array<{
    name: string;
    price: number;
    quantity: number;
    image_url?: string;
    variant?: Record<string, string> | null;
  }>;
  const customer = order.customer_snapshot as { full_name: string; phone: string; address: string; email?: string };

  const statusBanner =
    order.payment_status === "pending_verification" ? (
      <div
        className="flex items-start gap-3 rounded-xl border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100"
        role="status"
      >
        <Info className="mt-0.5 size-5 shrink-0 text-amber-700 dark:text-amber-400" aria-hidden />
        <p>Payment proof submitted. Waiting for vendor verification.</p>
      </div>
    ) : order.payment_status === "paid" ? (
      <div
        className="flex items-start gap-3 rounded-xl border border-emerald-200/80 bg-emerald-50 px-4 py-3 text-sm text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100"
        role="status"
      >
        <CheckCircle className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
        <p>Payment confirmed by vendor. Your order is being processed.</p>
      </div>
    ) : null;

  return (
    <div className="min-h-[60vh] bg-muted/25">
      <div className="container mx-auto max-w-5xl px-4 py-8 sm:py-10">
        <Breadcrumb className="mb-6">
          <BreadcrumbList className="text-xs uppercase tracking-wide">
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/">Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/orders">My orders</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Order detail</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Order detail</h1>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">ID</span>
              <code className="max-w-[min(100vw-8rem,28rem)] break-all rounded-md border border-border/60 bg-muted/40 px-2 py-1 font-mono text-xs text-foreground">
                {order.id}
              </code>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-8 shrink-0"
                onClick={() => copyOrderId(order.id)}
                aria-label={idCopied ? "Order ID copied" : "Copy order ID"}
              >
                {idCopied ? <Check className="size-4 text-emerald-600" aria-hidden /> : <Copy className="size-4" aria-hidden />}
              </Button>
              <StatusBadge type="order" value={order.status} />
              <StatusBadge type="payment" value={order.payment_status} />
            </div>
          </div>
          <PrintReceiptDialog data={buildOrderReceiptData(order)} className="shrink-0" />
        </header>

        {statusBanner && <div className="mb-6 sm:mb-8">{statusBanner}</div>}

        <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
          <div className="space-y-6 lg:col-span-2">
            {/* Items */}
            <Card className="overflow-hidden rounded-xl border-border/80 bg-card shadow-sm">
              <div className="flex items-center gap-2 border-b border-border/60 px-5 py-4">
                <Store className="size-5 shrink-0 text-primary" aria-hidden />
                <h2 className="text-sm font-semibold text-foreground">Items from {shop?.name ?? "Shop"}</h2>
              </div>
              <CardContent className="space-y-0 p-0">
                <ul className="divide-y divide-border/60">
                  {items.map((item, i) => (
                    <li key={i} className="flex gap-4 px-5 py-4">
                      <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-muted sm:size-[4.5rem]">
                        {item.image_url ? (
                          <Image src={item.image_url} alt="" fill className="object-cover" sizes="72px" />
                        ) : (
                          <div className="flex size-full items-center justify-center text-muted-foreground">
                            <Package className="size-7 opacity-40" aria-hidden />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-foreground">{item.name}</p>
                        {item.variant && Object.keys(item.variant).length > 0 && (
                          <p className="mt-1 text-sm text-muted-foreground">{formatVariant(item.variant)}</p>
                        )}
                        <p className="mt-1.5 text-xs text-muted-foreground">Qty: {item.quantity}</p>
                      </div>
                      <p className="shrink-0 text-sm font-semibold tabular-nums text-foreground sm:text-base">
                        {formatCurrency(item.price * item.quantity)}
                      </p>
                    </li>
                  ))}
                </ul>
                <div className="flex items-center justify-between border-t border-border/60 bg-muted/20 px-5 py-4">
                  <span className="text-sm font-medium text-muted-foreground">Total amount</span>
                  <span className="text-xl font-bold tabular-nums text-primary sm:text-2xl">
                    {formatCurrency(order.total)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Delivery */}
            <Card className="overflow-hidden rounded-xl border-border/80 bg-card shadow-sm">
              <div className="flex items-center gap-2 border-b border-border/60 px-5 py-4">
                <Truck className="size-5 shrink-0 text-primary" aria-hidden />
                <h2 className="text-sm font-semibold text-foreground">Delivery details</h2>
              </div>
              <CardContent className="space-y-6 p-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-1">
                    <DetailLabel>Recipient name</DetailLabel>
                    <p className="text-sm text-foreground">{customer.full_name}</p>
                  </div>
                  <div className="space-y-1">
                    <DetailLabel>Phone number</DetailLabel>
                    <p className="text-sm text-foreground">{customer.phone}</p>
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <DetailLabel>Delivery address</DetailLabel>
                    <p className="text-sm leading-relaxed text-foreground">{customer.address}</p>
                  </div>
                  {customer.email ? (
                    <div className="space-y-1 sm:col-span-2">
                      <DetailLabel>Contact email</DetailLabel>
                      <p className="text-sm text-foreground">{customer.email}</p>
                    </div>
                  ) : null}
                </div>
                <Separator className="opacity-60" />
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CalendarDays className="size-3.5 shrink-0" aria-hidden />
                  <span>Ordered on {formatDate(order.created_at)}</span>
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {paymentMethod && (
              <Card className="overflow-hidden rounded-xl border-border/80 bg-card shadow-sm">
                <div className="flex items-center gap-2 border-b border-border/60 px-5 py-4">
                  <CreditCard className="size-5 shrink-0 text-primary" aria-hidden />
                  <h2 className="text-sm font-semibold text-foreground">Payment</h2>
                </div>
                <CardContent className="space-y-5 p-5">
                  <div className="space-y-1">
                    <DetailLabel>Method</DetailLabel>
                    <p className="text-sm font-medium text-foreground">{paymentMethod.name}</p>
                  </div>
                  {paymentMethod.type === "cash" ? (
                    <p className="text-sm text-muted-foreground">Pay cash when your order arrives.</p>
                  ) : (
                    <div className="space-y-4">
                      {paymentMethod.bank_name ? (
                        <div className="space-y-1">
                          <DetailLabel>Bank name</DetailLabel>
                          <p className="text-sm text-foreground">{paymentMethod.bank_name}</p>
                        </div>
                      ) : null}
                      {paymentMethod.account_holder ? (
                        <div className="space-y-1">
                          <DetailLabel>Account holder</DetailLabel>
                          <p className="text-sm text-foreground">{paymentMethod.account_holder}</p>
                        </div>
                      ) : null}
                      {paymentMethod.account_number ? (
                        <div className="space-y-1">
                          <DetailLabel>Account number</DetailLabel>
                          <p className="font-mono text-sm text-foreground">{paymentMethod.account_number}</p>
                        </div>
                      ) : null}
                    </div>
                  )}
                  <div className="rounded-lg border border-border/80 bg-muted/40 px-4 py-3">
                    <DetailLabel>Amount</DetailLabel>
                    <p className="mt-1 text-lg font-bold tabular-nums text-foreground">{formatCurrency(order.total)}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {order.payment_status === "unpaid" && paymentMethod?.type === "bank" && paymentMethod.proof_required && (
              <Card className="overflow-hidden rounded-xl border-primary/30 bg-primary/5 shadow-sm">
                <div className="border-b border-primary/15 px-5 py-4">
                  <h2 className="text-sm font-semibold text-foreground">Submit payment proof</h2>
                </div>
                <CardContent className="space-y-3 p-5">
                  <p className="text-sm text-muted-foreground">
                    This payment method requires proof. After sending payment, upload your screenshot or receipt.
                  </p>
                  <label className="block">
                    <Button variant="outline" className="w-full border-primary/25" disabled={uploading || isPending} asChild>
                      <span>
                        <Upload className="mr-2 size-4" />
                        {uploading ? "Uploading…" : "Upload payment proof"}
                        <input type="file" accept="image/*" className="hidden" onChange={handleProofUpload} />
                      </span>
                    </Button>
                  </label>
                </CardContent>
              </Card>
            )}

            {shop?.slug && (
              <Card className="overflow-hidden rounded-xl border-0 bg-primary text-primary-foreground shadow-sm">
                <CardContent className="space-y-4 p-5">
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold">Need help?</h3>
                    <p className="text-sm text-primary-foreground/90">
                      Questions about this order? Contact the seller through their shop or phone if they shared one.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button variant="secondary" className="bg-background text-primary hover:bg-background/90" asChild>
                      <Link href={`/shop/${shop.slug}`}>Visit shop</Link>
                    </Button>
                    {shop.phone ? (
                      <Button
                        variant="outline"
                        className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
                        asChild
                      >
                        <a href={`tel:${shop.phone.replace(/\s/g, "")}`}>Call seller</a>
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
