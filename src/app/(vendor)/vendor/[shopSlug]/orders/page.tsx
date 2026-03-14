import { notFound } from "next/navigation";
import Link from "next/link";
import { getMyShops } from "@/actions/shops";
import { getShopOrders } from "@/actions/orders";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { OrderStatusActions } from "@/components/vendor/OrderStatusActions";
import { ShoppingBag } from "lucide-react";

type Props = { params: Promise<{ shopSlug: string }> };

export default async function VendorOrdersPage({ params }: Props) {
  const { shopSlug } = await params;
  const shops = await getMyShops();
  const shop = shops.find((s) => s.slug === shopSlug);
  if (!shop) notFound();

  const orders = await getShopOrders(shop.id);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Orders ({orders.length})</h1>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-16 border rounded-xl text-muted-foreground">
          <ShoppingBag className="h-10 w-10 mx-auto mb-3" />
          <p>No orders yet. Share your shop link to start selling!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const customer = order.customer_snapshot as {
              full_name: string;
              phone: string;
              address: string;
            };
            const items = order.items_snapshot as Array<{
              name: string;
              quantity: number;
            }>;

            return (
              <Card key={order.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="min-w-0">
                      <Link
                        href={`/vendor/${shopSlug}/orders/${order.id}`}
                        className="font-semibold hover:text-primary transition-colors"
                      >
                        {customer?.full_name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {customer?.phone} • {formatDateTime(order.created_at)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {items.map((i) => `${i.name} ×${i.quantity}`).join(", ")}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-primary">{formatCurrency(order.total)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge type="order" value={order.status} />
                    <StatusBadge type="payment" value={order.payment_status} />
                    <OrderStatusActions
                      orderId={order.id}
                      paymentStatus={order.payment_status}
                      orderStatus={order.status}
                      paymentProofUrl={order.payment_proof_url ?? null}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
