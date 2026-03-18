import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getMyShops } from "@/actions/shops";
import { getOrderById } from "@/actions/orders";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { OrderStatusActions } from "@/components/vendor/OrderStatusActions";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { ArrowLeft, User, MapPin, Phone, Mail, FileImage, Banknote, DollarSign, Wallet } from "lucide-react";

type Props = { params: Promise<{ shopSlug: string; orderId: string }> };

export default async function VendorOrderDetailPage({ params }: Props) {
  const { shopSlug, orderId } = await params;

  const [shops, order] = await Promise.all([
    getMyShops(),
    getOrderById(orderId),
  ]);

  const shop = shops.find((s) => s.slug === shopSlug);
  if (!shop || !order || order.shop_id !== shop.id) notFound();

  const customer = order.customer_snapshot as {
    full_name: string;
    phone: string;
    address: string;
    email?: string;
  };
  const items = order.items_snapshot as Array<{
    name: string;
    price: number;
    quantity: number;
    image_url?: string;
    variant?: string | null;
  }>;

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/vendor/${shopSlug}/orders`}
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" />Back to Orders
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-xl font-bold">Order Detail</h1>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">{order.id}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {formatDateTime(order.created_at)}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <StatusBadge type="order" value={order.status} />
          <StatusBadge type="payment" value={order.payment_status} />
        </div>
      </div>

      {/* Actions */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Fulfillment Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <OrderStatusActions
            orderId={order.id}
            paymentStatus={order.payment_status}
            orderStatus={order.status}
            paymentProofUrl={order.payment_proof_url ?? null}
            paymentMethodType={(order.payment_methods as { type?: string } | null)?.type ?? null}
          />
          {order.payment_status === "unpaid" && (order.payment_methods as { type?: string } | null)?.type !== "cash" && (
            <p className="text-xs text-muted-foreground mt-3">
              Waiting for customer to submit payment proof.
            </p>
          )}
          {order.payment_status === "paid" && order.status === "delivered" && (
            <p className="text-xs text-green-600 mt-3 font-medium">
              Order complete — payment confirmed and delivered.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Payment Method */}
      {order.payment_methods && (
        <Card className="mb-6 bg-muted/30">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              {order.payment_methods.type === "cash" ? (
                <Wallet className="h-4 w-4 text-green-600" />
              ) : (
                <DollarSign className="h-4 w-4 text-blue-600" />
              )}
              <CardTitle className="text-sm">Payment Method</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <p className="font-semibold">{order.payment_methods.name}</p>
              {order.payment_methods.type === "bank" && (
                <div className="mt-2 space-y-1">
                  {order.payment_methods.bank_name && (
                    <p><span className="text-muted-foreground">Bank:</span> {order.payment_methods.bank_name}</p>
                  )}
                  {order.payment_methods.account_holder && (
                    <p><span className="text-muted-foreground">Account:</span> {order.payment_methods.account_holder}</p>
                  )}
                  {order.payment_methods.account_number && (
                    <p><span className="text-muted-foreground">Number:</span> <code className="font-mono">{order.payment_methods.account_number}</code></p>
                  )}
                  {order.payment_methods.proof_required && (
                    <p className="text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded mt-2 inline-block">
                      Proof required
                    </p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Proof */}
      {order.payment_proof_url && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <FileImage className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm">Payment Proof</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <a
              href={order.payment_proof_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <div className="relative w-full max-w-sm rounded-lg overflow-hidden border hover:opacity-90 transition-opacity">
                <Image
                  src={order.payment_proof_url}
                  alt="Payment proof"
                  width={400}
                  height={300}
                  className="w-full h-auto object-contain bg-muted"
                  unoptimized
                />
              </div>
              <p className="text-xs text-primary underline mt-2">
                Click to open full size
              </p>
            </a>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Order Items */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              Items ({items.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.map((item, i) => (
              <div key={i} className="flex gap-3">
                <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-muted shrink-0">
                  {item.image_url ? (
                    <Image
                      src={item.image_url}
                      alt={item.name}
                      fill
                      className="object-cover"
                      sizes="56px"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xl">📦</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{item.name}</p>
                  {item.variant && (
                    <p className="text-xs text-muted-foreground">Variant: {item.variant}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {item.quantity} × {formatCurrency(item.price)}
                  </p>
                </div>
                <p className="text-sm font-semibold shrink-0">
                  {formatCurrency(item.price * item.quantity)}
                </p>
              </div>
            ))}
            <Separator />
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              {order.shipping_fee > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Shipping</span>
                  <span>{formatCurrency(order.shipping_fee)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span className="text-primary">{formatCurrency(order.total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer Details */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm">Customer</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="font-medium">{customer.full_name}</p>
            <p className="flex items-center gap-1.5 text-muted-foreground">
              <Phone className="h-3.5 w-3.5 shrink-0" />
              {customer.phone}
            </p>
            {customer.email && (
              <p className="flex items-center gap-1.5 text-muted-foreground">
                <Mail className="h-3.5 w-3.5 shrink-0" />
                {customer.email}
              </p>
            )}
            <p className="flex items-start gap-1.5 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              {customer.address}
            </p>
          </CardContent>
        </Card>

        {/* Notes */}
        {order.notes && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Order Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{order.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
