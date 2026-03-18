import { notFound } from "next/navigation";
import Link from "next/link";
import { getMyShops, requestInspection } from "@/actions/shops";
import { getShopOrders } from "@/actions/orders";
import { getShopProducts } from "@/actions/products";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShopShareCard } from "@/components/vendor/ShopShareCard";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { Package, ShoppingBag, DollarSign, ClipboardCheck, AlertCircle, TrendingUp, ArrowRight } from "lucide-react";
import { revalidatePath } from "next/cache";

type Props = { params: Promise<{ shopSlug: string }> };

async function handleRequestInspection(shopId: string, slug: string, _formData: FormData) {
  "use server";
  const result = await requestInspection(shopId);
  revalidatePath(`/vendor/${slug}`);
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

  const pendingVerification = orders.filter((o) => o.payment_status === "pending_verification").length;

  const requestAction = handleRequestInspection.bind(null, shop.id, shop.slug);
  const canRequestInspection = shop.status === "draft" && products.length >= 3;

  const metrics = [
    { label: "Products", value: products.length, icon: Package, href: "products", color: "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400" },
    { label: "Total Orders", value: orders.length, icon: ShoppingBag, href: "orders", color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400" },
    { label: "Revenue", value: formatCurrency(revenue), icon: DollarSign, href: "orders", color: "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400" },
    { label: "Pending Proofs", value: pendingVerification, icon: ClipboardCheck, href: "orders", color: "bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400" },
  ];

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight">{shop.name}</h1>
            <div className="flex items-center gap-3 mt-2">
              <StatusBadge type="shop" value={shop.status} />
              {shop.status === "active" && (
                <Button asChild variant="outline" size="sm">
                  <Link href={`/shop/${shop.slug}`} target="_blank" className="gap-2">
                    View Public Shop
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Status Alerts */}
      {shop.status === "draft" && (
        <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertTitle className="text-amber-900 dark:text-amber-200">Complete Setup to Launch</AlertTitle>
          <AlertDescription className="text-amber-800 dark:text-amber-300">
            Add at least 3 products then request inspection to go live.
            {products.length < 3 && (
              <div className="mt-2 flex items-center gap-2">
                <div className="h-2 flex-1 rounded-full bg-amber-200 dark:bg-amber-800">
                  <div className="h-2 rounded-full bg-amber-600 dark:bg-amber-400" style={{ width: `${(products.length / 3) * 100}%` }} />
                </div>
                <span className="text-sm font-medium">{products.length}/3</span>
              </div>
            )}
            {canRequestInspection && (
              <form action={requestAction} className="mt-3">
                <Button type="submit" size="sm" className="bg-amber-600 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-700">
                  <ClipboardCheck className="mr-2 h-4 w-4" />
                  Request Inspection
                </Button>
              </form>
            )}
          </AlertDescription>
        </Alert>
      )}

      {shop.status === "rejected" && shop.rejection_reason && (
        <Alert className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950">
          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
          <AlertTitle className="text-red-900 dark:text-red-200">Shop Rejected</AlertTitle>
          <AlertDescription className="text-red-800 dark:text-red-300">
            {shop.rejection_reason}
            <p className="mt-2 text-sm">Fix the issues then request re-inspection from Settings.</p>
          </AlertDescription>
        </Alert>
      )}

      {/* Share Your Shop */}
      <ShopShareCard
        shopSlug={shop.slug}
        shopName={shop.name}
        status={shop.status as "draft" | "pending" | "active" | "rejected" | "suspended"}
      />

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map(({ label, value, icon: Icon, href, color }) => (
          <Link key={label} href={`/vendor/${shopSlug}/${href}`}>
            <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer h-full border-0 bg-white dark:bg-slate-950">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-muted-foreground mb-2">{label}</p>
                    <p className="text-2xl md:text-3xl font-bold tracking-tight">{value}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent Orders Section */}
      <Card className="border-0 bg-white dark:bg-slate-950 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Orders</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Latest transactions from your customers</p>
            </div>
            <Link href={`/vendor/${shopSlug}/orders`} className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
              View all
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="py-12 text-center">
              <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground font-medium">No orders yet</p>
              <p className="text-sm text-muted-foreground mt-1">Orders from customers will appear here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {orders.slice(0, 5).map((order) => {
                const customer = order.customer_snapshot as { full_name: string; phone: string };
                return (
                  <Link key={order.id} href={`/orders/${order.id}`}>
                    <div className="group flex items-center justify-between gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{customer?.full_name ?? "Customer"}</p>
                        <p className="text-xs text-muted-foreground">{formatDateTime(order.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <StatusBadge type="payment" value={order.payment_status} />
                        <span className="font-semibold text-sm min-w-fit text-right">{formatCurrency(order.total)}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
