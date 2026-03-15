import { notFound } from "next/navigation";
import Link from "next/link";
import { getMyShops } from "@/actions/shops";
import { getShopOrders } from "@/actions/orders";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { OrderStatusActions } from "@/components/vendor/OrderStatusActions";
import { ShoppingBag, ArrowRight, Calendar, User, Package as PackageIcon } from "lucide-react";

type Props = { params: Promise<{ shopSlug: string }> };

export default async function VendorOrdersPage({ params }: Props) {
  const { shopSlug } = await params;
  const shops = await getMyShops();
  const shop = shops.find((s) => s.slug === shopSlug);
  if (!shop) notFound();

  const orders = await getShopOrders(shop.id);

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
          <p className="text-sm text-muted-foreground mt-1">{orders.length} total {orders.length === 1 ? 'order' : 'orders'}</p>
        </div>
      </div>

      {orders.length === 0 ? (
        <Card className="border-0 bg-white dark:bg-slate-950">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-16 w-16 rounded-full bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center mb-4">
              <ShoppingBag className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="font-semibold text-lg mb-1">No orders yet</h3>
            <p className="text-sm text-muted-foreground">Share your shop link to start receiving orders</p>
          </CardContent>
        </Card>
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
              <Link key={order.id} href={`/vendor/${shopSlug}/orders/${order.id}`}>
                <Card className="border-0 bg-white dark:bg-slate-950 hover:shadow-md transition-shadow cursor-pointer group">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="h-4 w-4 text-muted-foreground shrink-0" />
                          <p className="font-semibold group-hover:text-primary transition-colors truncate">
                            {customer?.full_name}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                          <Calendar className="h-3.5 w-3.5 shrink-0" />
                          <span>{formatDateTime(order.created_at)}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <PackageIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {items.map((i) => `${i.name} ×${i.quantity}`).join(" • ")}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-lg font-bold text-primary">{formatCurrency(order.total)}</p>
                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors mt-2 ml-auto" />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap pt-3 border-t border-border/50">
                      <StatusBadge type="order" value={order.status} />
                      <StatusBadge type="payment" value={order.payment_status} />
                      <div className="flex-1" />
                      <OrderStatusActions
                        orderId={order.id}
                        paymentStatus={order.payment_status}
                        orderStatus={order.status}
                        paymentProofUrl={order.payment_proof_url ?? null}
                      />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
