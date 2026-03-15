"use client";

import { useEffect, useState, useTransition } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { getOrderById, submitPaymentProof } from "@/actions/orders";
import { uploadPaymentProof } from "@/lib/supabase/storage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Upload, CheckCircle } from "lucide-react";
import Link from "next/link";

type Order = NonNullable<Awaited<ReturnType<typeof getOrderById>>>;

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getOrderById(id).then((o) => { setOrder(o as Order); setLoading(false); });
  }, [id]);

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
    } catch (err) {
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-10 max-w-2xl space-y-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">
        Order not found. <Link href="/orders" className="text-primary underline">View my orders</Link>
      </div>
    );
  }

  const shop = order.shops as { name: string; slug: string; phone?: string } | null;
  const paymentMethod = order.payment_methods as { name: string; type: string; bank_name?: string; account_holder?: string; account_number?: string; proof_required: boolean } | null;
  const items = order.items_snapshot as Array<{ name: string; price: number; quantity: number; image_url?: string }>;
  const customer = order.customer_snapshot as { full_name: string; phone: string; address: string; email?: string };

  return (
    <div className="container mx-auto px-4 py-10 max-w-2xl space-y-6">
      <div>
        <Link href="/orders" className="text-sm text-muted-foreground hover:text-foreground">← My Orders</Link>
        <h1 className="text-2xl font-bold mt-1">Order Detail</h1>
        <p className="text-xs text-muted-foreground font-mono mt-0.5">{order.id}</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <StatusBadge type="order" value={order.status} />
        <StatusBadge type="payment" value={order.payment_status} />
      </div>

      {/* Payment Method Card */}
      {paymentMethod && (
        <Card className="bg-muted/30">
          <CardHeader><CardTitle className="text-base">Payment Method</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm font-semibold">{paymentMethod.name}</p>
              {paymentMethod.type === "cash" ? (
                <p className="text-sm text-muted-foreground">Pay cash when your order arrives.</p>
              ) : (
                <div className="space-y-1 text-sm">
                  {paymentMethod.bank_name && (
                    <p><span className="font-medium">Bank:</span> {paymentMethod.bank_name}</p>
                  )}
                  {paymentMethod.account_holder && (
                    <p><span className="font-medium">Account Holder:</span> {paymentMethod.account_holder}</p>
                  )}
                  {paymentMethod.account_number && (
                    <p><span className="font-medium">Account Number:</span> <code className="font-mono bg-background px-1 py-0.5 rounded">{paymentMethod.account_number}</code></p>
                  )}
                  <p className="text-xs text-muted-foreground font-semibold text-primary">Amount: {formatCurrency(order.total)}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Proof Section */}
      {order.payment_status === "unpaid" && paymentMethod?.type === "bank" && paymentMethod.proof_required && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader><CardTitle className="text-base">Submit Payment Proof</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              This payment method requires proof. After sending payment, upload your screenshot or receipt:
            </p>
            <label className="block">
              <Button variant="outline" className="w-full" disabled={uploading || isPending} asChild>
                <span>
                  <Upload className="mr-2 h-4 w-4" />
                  {uploading ? "Uploading…" : "Upload Payment Proof"}
                  <input type="file" accept="image/*" className="hidden" onChange={handleProofUpload} />
                </span>
              </Button>
            </label>
          </CardContent>
        </Card>
      )}

      {order.payment_status === "pending_verification" && (
        <Card className="border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-yellow-600 shrink-0" />
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              Payment proof submitted. Waiting for vendor verification.
            </p>
          </CardContent>
        </Card>
      )}

      {order.payment_status === "paid" && (
        <Card className="border-green-300 bg-green-50 dark:bg-green-950/20">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
            <p className="text-sm text-green-800 dark:text-green-200">
              Payment confirmed by vendor. Your order is being processed.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Order Items */}
      <Card>
        <CardHeader><CardTitle className="text-base">Items from {shop?.name}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {items.map((item, i) => (
            <div key={i} className="flex gap-3">
              <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-muted shrink-0">
                {item.image_url ? (
                  <Image src={item.image_url} alt={item.name} fill className="object-cover" sizes="56px" />
                ) : <div className="flex h-full items-center justify-center">📦</div>}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{item.name}</p>
                <p className="text-xs text-muted-foreground">Qty: {item.quantity} × {formatCurrency(item.price)}</p>
              </div>
              <p className="text-sm font-semibold">{formatCurrency(item.price * item.quantity)}</p>
            </div>
          ))}
          <Separator />
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span className="text-primary">{formatCurrency(order.total)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Delivery Details */}
      <Card>
        <CardHeader><CardTitle className="text-base">Delivery Details</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p><span className="text-muted-foreground">Name:</span> {customer.full_name}</p>
          <p><span className="text-muted-foreground">Phone:</span> {customer.phone}</p>
          <p><span className="text-muted-foreground">Address:</span> {customer.address}</p>
          {customer.email && <p><span className="text-muted-foreground">Email:</span> {customer.email}</p>}
          <p className="text-xs text-muted-foreground mt-2">Ordered {formatDateTime(order.created_at)}</p>
        </CardContent>
      </Card>
    </div>
  );
}
