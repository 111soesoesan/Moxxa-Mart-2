import { getPlatformStats } from "@/actions/admin";
import { getPendingShops } from "@/actions/shops";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Store, Package, ShoppingBag, Clock, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";

export default async function AdminOverviewPage() {
  const [stats, pending] = await Promise.all([getPlatformStats(), getPendingShops()]);

  const statCards = [
    { label: "Total Shops", value: stats.totalShops, icon: Store, color: "text-blue-600" },
    { label: "Active Shops", value: stats.activeShops, icon: CheckCircle, color: "text-green-600" },
    { label: "Pending Review", value: stats.pendingShops, icon: Clock, color: "text-yellow-600" },
    { label: "Active Products", value: stats.totalProducts, icon: Package, color: "text-purple-600" },
    { label: "Total Orders", value: stats.totalOrders, icon: ShoppingBag, color: "text-orange-600" },
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <h1 className="text-2xl font-bold mb-6">Platform Overview</h1>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="pt-5 pb-4">
              <Icon className={`h-5 w-5 mb-2 ${color}`} />
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Shops Awaiting Inspection</CardTitle>
              <Button asChild size="sm" variant="outline">
                <Link href="/admin/shops">View all</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {pending.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">All clear — no shops pending review.</p>
            ) : (
              <div className="space-y-2">
                {pending.slice(0, 5).map((shop) => {
                  const profile = shop.profiles as { full_name?: string } | null;
                  return (
                    <div key={shop.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <p className="text-sm font-medium">{shop.name}</p>
                        <p className="text-xs text-muted-foreground">{profile?.full_name ?? "Unknown vendor"}</p>
                      </div>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/admin/shops`}>Review</Link>
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild className="w-full justify-start" variant="outline">
              <Link href="/admin/shops">
                <Store className="mr-2 h-4 w-4" />Manage Shop Applications
              </Link>
            </Button>
            <Button asChild className="w-full justify-start" variant="outline">
              <Link href="/admin/billing">
                <ShoppingBag className="mr-2 h-4 w-4" />Review Billing Proofs
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
