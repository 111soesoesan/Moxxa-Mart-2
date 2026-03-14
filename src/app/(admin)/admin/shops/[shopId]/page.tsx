import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getAdminShopWithProducts } from "@/actions/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCurrency } from "@/lib/utils";
import { ArrowLeft, MapPin, Phone, Package } from "lucide-react";

type Props = { params: Promise<{ shopId: string }> };

export default async function AdminShopPreviewPage({ params }: Props) {
  const { shopId } = await params;
  const { shop, products } = await getAdminShopWithProducts(shopId);
  if (!shop) notFound();

  const profile = shop.profiles as { full_name?: string; avatar_url?: string } | null;
  const paymentInfo = shop.payment_info as Record<string, string> | null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/shops">
            <ArrowLeft className="h-4 w-4 mr-1" />Back to Queue
          </Link>
        </Button>
      </div>

      {/* Shop Header */}
      <div className="relative mb-6">
        {shop.cover_url && (
          <div className="relative h-40 w-full rounded-xl overflow-hidden mb-4 bg-muted">
            <Image src={shop.cover_url} alt={`${shop.name} cover`} fill className="object-cover" />
          </div>
        )}
        <div className="flex items-start gap-4">
          <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-muted shrink-0 border">
            {shop.logo_url ? (
              <Image src={shop.logo_url} alt={shop.name} fill className="object-cover" sizes="64px" />
            ) : (
              <div className="flex h-full items-center justify-center text-3xl">🏪</div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h1 className="text-xl font-bold">{shop.name}</h1>
                <p className="text-sm text-muted-foreground">by {profile?.full_name ?? "Unknown vendor"}</p>
              </div>
              <StatusBadge type="shop" value={shop.status} />
            </div>
            <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
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
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          {/* About */}
          {shop.description && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">About the Shop</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{shop.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Products */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm">Products ({products.length})</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {products.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No products added yet.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {products.map((product) => (
                    <div key={product.id} className="group rounded-lg border overflow-hidden">
                      <div className="relative aspect-square bg-muted">
                        {product.image_urls?.[0] ? (
                          <Image
                            src={product.image_urls[0]}
                            alt={product.name}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 50vw, 200px"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-2xl text-muted-foreground">
                            📦
                          </div>
                        )}
                        {!product.is_active && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <span className="text-white text-xs font-medium">Inactive</span>
                          </div>
                        )}
                      </div>
                      <div className="p-2">
                        <p className="text-xs font-medium line-clamp-1">{product.name}</p>
                        <p className="text-xs text-primary font-semibold">
                          {formatCurrency(product.price)}
                        </p>
                        {product.stock === 0 && (
                          <p className="text-xs text-destructive">Out of stock</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {/* Payment Info */}
          {paymentInfo && Object.keys(paymentInfo).length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Payment Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {Object.entries(paymentInfo).map(([method, detail]) => (
                  <div key={method} className="text-sm bg-muted rounded p-2">
                    <span className="font-medium">{method}:</span>{" "}
                    <span className="font-mono">{detail}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Delivery Policy */}
          {shop.delivery_policy && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Delivery & Refund Policy</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {shop.delivery_policy}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
