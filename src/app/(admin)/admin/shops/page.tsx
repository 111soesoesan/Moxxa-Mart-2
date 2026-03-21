import { getPendingShops } from "@/actions/shops";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShopApprovalActions } from "@/components/admin/ShopApprovalActions";
import { formatDateTime } from "@/lib/utils";
import { CheckCircle, MapPin, Phone, Calendar, Eye } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default async function AdminShopsPage() {
  const shops = await getPendingShops();

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Shop Inspection Queue</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review shops requesting to go live on the marketplace.
          </p>
        </div>
        <Badge variant="secondary">{shops.length} pending</Badge>
      </div>

      {shops.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground border rounded-xl">
          <CheckCircle className="h-10 w-10 mx-auto mb-3 text-green-500" />
          <p className="font-medium">All caught up!</p>
          <p className="text-sm mt-1">No shops are pending inspection.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {shops.map((shop) => {
            const profile = shop.profiles as { full_name?: string; avatar_url?: string } | null;
            const methods = (shop.payment_methods ?? []) as { id: string; name: string; type: string }[];

            return (
              <Card key={shop.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-4">
                    <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-muted shrink-0">
                      {shop.logo_url ? (
                        <Image
                          src={shop.logo_url}
                          alt={shop.name}
                          fill
                          className="object-cover"
                          sizes="56px"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-2xl">🏪</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <CardTitle className="text-base">{shop.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            by {profile?.full_name ?? "Unknown"}
                          </p>
                        </div>
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/admin/shops/${shop.id}`}>
                            <Eye className="h-3.5 w-3.5 mr-1" />Full Preview
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {shop.description && (
                    <p className="text-sm text-muted-foreground">{shop.description}</p>
                  )}
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {shop.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />{shop.location}
                      </span>
                    )}
                    {shop.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />{shop.phone}
                      </span>
                    )}
                    {shop.inspection_requested_at && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Requested {formatDateTime(shop.inspection_requested_at)}
                      </span>
                    )}
                  </div>
                  {shop.delivery_policy && (
                    <div className="text-xs bg-muted rounded p-2">
                      <span className="font-medium">Policy: </span>{shop.delivery_policy}
                    </div>
                  )}
                  {methods.length > 0 && (
                    <div className="text-xs bg-muted rounded p-2 space-y-0.5">
                      <span className="font-medium">Payment Methods:</span>
                      {methods.map((pm) => (
                        <div key={pm.id}>
                          {pm.name} <span className="text-muted-foreground">({pm.type})</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <ShopApprovalActions shopId={shop.id} shopName={shop.name} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
