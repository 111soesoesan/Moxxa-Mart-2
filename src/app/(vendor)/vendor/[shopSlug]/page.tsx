import { notFound } from "next/navigation";
import Link from "next/link";
import { getMyShops, requestInspection } from "@/actions/shops";
import { getShopOrders } from "@/actions/orders";
import { getShopProducts } from "@/actions/products";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Alert } from "@/components/ui/alert";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { Package, ShoppingBag, DollarSign, ClipboardCheck } from "lucide-react";
import { revalidatePath } from "next/cache";

type Props = { params: Promise<{ shopSlug: string }> };

async function handleRequestInspection(shopId: string, slug: string) {
  "use server";
  const result = await requestInspection(shopId);
  revalidatePath(`/vendor/${slug}`);
  return result;
}

export default async function ShopDashboardPage({ params }: Props) {
  const { shopSlug } = await params;
  const shops = await getMyShops();
  const shop = shops.find((s) => s.slug === shopSlug);
  if (!shop) notFound();

  const [products, orders] = await Promise.all([
    getShopProducts(shop.id),
    getShopOrders(shop.id),
  ]);

  const revenue = orders
    .filter((o) => o.payment_status === "paid")
    .reduce((s, o) => s + o.total, 0);

  const requestAction = handleRequestInspection.bind(null, shop.id, shop.slug);
  const canRequestInspection = shop.status === "draft" && products.length >= 3;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{shop.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <StatusBadge type="shop" value={shop.status} />
          </div>
        </div>
        {shop.status === "active" && (
          <Button asChild variant="outline" size="sm">
            <Link href={`/shop/${shop.slug}`} target="_blank">View Public Page</Link>
          </Button>
        )}
      </div>

      {shop.status === "draft" && (
        <Alert className="mb-6">
          <p className="font-medium">Your shop is in Draft mode</p>
          <p className="text-sm text-muted-foreground mt-1">
            Add at least 3 products then request inspection to go live.
            {products.length < 3 && ` You have ${products.length}/3 products.`}
          </p>
          {canRequestInspection && (
            <form action={requestAction} className="mt-3">
              <Button type="submit" size="sm">
                <ClipboardCheck className="mr-2 h-4 w-4" />Request Inspection
              </Button>
            </form>
          )}
        </Alert>
      )}

      {shop.status === "rejected" && shop.rejection_reason && (
        <Alert variant="destructive" className="mb-6">
          <p className="font-medium">Shop Rejected</p>
          <p className="text-sm mt-1">{shop.rejection_reason}</p>
          <p className="text-sm text-muted-foreground mt-1">Fix the issues then request re-inspection from Settings.</p>
        </Alert>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Products", value: products.length, icon: Package, href: "products" },
          { label: "Total Orders", value: orders.length, icon: ShoppingBag, href: "orders" },
          { label: "Paid Revenue", value: formatCurrency(revenue), icon: DollarSign, href: "orders" },
          { label: "Pending Proofs", value: orders.filter((o) => o.payment_status === "pending_verification").length, icon: ClipboardCheck, href: "orders" },
        ].map(({ label, value, icon: Icon, href }) => (
          <Link key={label} href={`/vendor/${shopSlug}/${href}`}>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>
                <p className="text-2xl font-bold">{value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Recent Orders</h2>
          <Link href={`/vendor/${shopSlug}/orders`} className="text-sm text-primary hover:underline">View all</Link>
        </div>
        {orders.length === 0 ? (
          <p className="text-muted-foreground text-sm py-4">No orders yet.</p>
        ) : (
          <div className="space-y-2">
            {orders.slice(0, 5).map((order) => {
              const customer = order.customer_snapshot as { full_name: string; phone: string };
              return (
                <Link key={order.id} href={`/orders/${order.id}`}>
                  <Card className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-3 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{customer?.full_name ?? "Customer"}</p>
                        <p className="text-xs text-muted-foreground">{formatDateTime(order.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <StatusBadge type="payment" value={order.payment_status} />
                        <span className="font-semibold text-sm">{formatCurrency(order.total)}</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
