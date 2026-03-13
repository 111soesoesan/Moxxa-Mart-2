import Link from "next/link";
import { getMyShops } from "@/actions/shops";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Plus, Store, LayoutDashboard } from "lucide-react";

export default async function VendorHubPage() {
  const shops = await getMyShops();

  return (
    <div className="container mx-auto px-4 py-10 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Vendor Hub</h1>
          <p className="text-muted-foreground text-sm">Manage your shops and listings</p>
        </div>
        <Button asChild>
          <Link href="/vendor/onboarding"><Plus className="mr-2 h-4 w-4" />New Shop</Link>
        </Button>
      </div>

      {shops.length === 0 ? (
        <div className="text-center py-20 border rounded-xl">
          <Store className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold mb-1">No shops yet</h2>
          <p className="text-muted-foreground text-sm mb-4">Create your first shop to start selling.</p>
          <Button asChild>
            <Link href="/vendor/onboarding">Open a Shop</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {shops.map((shop) => (
            <Card key={shop.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={shop.logo_url ?? undefined} />
                    <AvatarFallback>{shop.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-sm truncate">{shop.name}</CardTitle>
                    <p className="text-xs text-muted-foreground truncate">/shop/{shop.slug}</p>
                  </div>
                </div>
                <div className="mt-2">
                  <StatusBadge type="shop" value={shop.status} />
                  {shop.status === "rejected" && shop.rejection_reason && (
                    <p className="text-xs text-destructive mt-1">{shop.rejection_reason}</p>
                  )}
                </div>
              </CardHeader>
              <CardFooter className="mt-auto pt-3">
                <Button asChild className="w-full" variant="outline" size="sm">
                  <Link href={`/vendor/${shop.slug}`}>
                    <LayoutDashboard className="mr-2 h-3.5 w-3.5" />Manage
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
