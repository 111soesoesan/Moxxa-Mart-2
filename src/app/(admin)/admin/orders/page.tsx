import { getRecentOrders } from "@/actions/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { ShoppingBag } from "lucide-react";

export default async function AdminOrdersPage() {
  const orders = await getRecentOrders(50);

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">All Orders</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Recent platform orders across all shops.
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-20 border rounded-xl text-muted-foreground">
          <ShoppingBag className="h-10 w-10 mx-auto mb-3" />
          <p className="font-medium">No orders yet</p>
          <p className="text-sm mt-1">Orders will appear here once customers start purchasing.</p>
        </div>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{orders.length} most recent orders</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {orders.map((order) => {
                const shop = order.shops as { name: string; slug: string } | null;
                const customer = order.customer_snapshot as {
                  full_name: string;
                  phone: string;
                  address: string;
                } | null;
                const items = order.items_snapshot as Array<{
                  name: string;
                  quantity: number;
                }>;

                return (
                  <div key={order.id} className="flex items-start gap-4 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <StatusBadge type="order" value={order.status} />
                        <StatusBadge type="payment" value={order.payment_status} />
                      </div>
                      <p className="text-sm font-medium">
                        {customer?.full_name ?? "Guest"}{" "}
                        <span className="text-muted-foreground font-normal">
                          → {shop?.name ?? "Unknown shop"}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {items.map((i) => `${i.name} ×${i.quantity}`).join(", ").slice(0, 80)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDateTime(order.created_at)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-primary">
                        {formatCurrency(order.total)}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">
                        {order.id.slice(0, 8)}…
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
