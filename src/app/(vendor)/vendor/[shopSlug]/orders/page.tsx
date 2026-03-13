import { notFound } from "next/navigation";
import Link from "next/link";
import { getMyShops } from "@/actions/shops";
import { getShopOrders, updateOrderStatus, markOrderPaid } from "@/actions/orders";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Props = { params: Promise<{ shopSlug: string }> };

export default async function VendorOrdersPage({ params }: Props) {
  const { shopSlug } = await params;
  const shops = await getMyShops();
  const shop = shops.find((s) => s.slug === shopSlug);
  if (!shop) notFound();

  const orders = await getShopOrders(shop.id);

  async function handleStatusUpdate(orderId: string, status: string) {
    "use server";
    await updateOrderStatus(orderId, status);
    revalidatePath(`/vendor/${shopSlug}/orders`);
  }

  async function handleMarkPaid(orderId: string) {
    "use server";
    await markOrderPaid(orderId);
    revalidatePath(`/vendor/${shopSlug}/orders`);
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-xl font-bold mb-6">Orders ({orders.length})</h1>

      {orders.length === 0 ? (
        <div className="text-center py-16 border rounded-xl text-muted-foreground">
          <p>No orders yet. Share your shop link to start selling!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const customer = order.customer_snapshot as { full_name: string; phone: string; address: string };
            const items = order.items_snapshot as Array<{ name: string; quantity: number }>;

            return (
              <Card key={order.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <p className="font-semibold">{customer?.full_name}</p>
                      <p className="text-xs text-muted-foreground">{customer?.phone} • {formatDateTime(order.created_at)}</p>
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

                    {order.payment_status === "pending_verification" && (
                      <form action={handleMarkPaid.bind(null, order.id)}>
                        <Button size="sm" type="submit" className="h-7 text-xs">
                          ✓ Mark Paid
                        </Button>
                      </form>
                    )}

                    {order.payment_status === "paid" && order.status !== "delivered" && order.status !== "cancelled" && (
                      <form className="flex items-center gap-2">
                        <input type="hidden" name="orderId" value={order.id} />
                        <Select onValueChange={(val) => handleStatusUpdate(order.id, val)}>
                          <SelectTrigger className="h-7 text-xs w-36">
                            <SelectValue placeholder="Update status" />
                          </SelectTrigger>
                          <SelectContent>
                            {["processing", "shipped", "delivered", "cancelled"].map((s) => (
                              <SelectItem key={s} value={s} className="text-xs capitalize">{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </form>
                    )}

                    {order.payment_proof_url && (
                      <a
                        href={order.payment_proof_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary underline"
                      >
                        View Proof
                      </a>
                    )}
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
