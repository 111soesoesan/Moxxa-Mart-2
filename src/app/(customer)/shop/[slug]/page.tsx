import { notFound } from "next/navigation";
import { getShopBySlug } from "@/actions/shops";
import { getPublicProducts } from "@/actions/products";
import { getShopPaymentMethodsForCustomers } from "@/actions/paymentMethods";
import { getViewerShopRatingState } from "@/actions/ratings";
import { LatestProductsSection } from "@/components/shop/LatestProductsSection";
import { PromotionalBanner } from "@/components/shop/PromotionalBanner";
import { ShopBlogSection } from "@/components/shop/ShopBlogSection";
import { ShopRatingSection } from "@/components/ratings/ShopRatingSection";
import { Separator } from "@/components/ui/separator";
import { MapPin, Phone, Banknote, Landmark } from "lucide-react";

type Props = { params: Promise<{ slug: string }> };

export default async function ShopPage({ params }: Props) {
  const { slug } = await params;
  const shop = await getShopBySlug(slug);
  if (!shop) notFound();

  const latestProducts = await getPublicProducts({ shopId: shop.id, limit: 8, sort: "newest" });
  const { data: paymentMethods } = await getShopPaymentMethodsForCustomers(shop.id);
  const ratingViewer = await getViewerShopRatingState(shop.id);

  const ratingAvg = shop.rating_avg ?? null;
  const ratingCount = shop.rating_count ?? 0;

  return (
    <div className="container mx-auto px-4">
      <LatestProductsSection
        products={latestProducts}
        shopName={shop.name}
        shopSlug={shop.slug}
        ratingAvg={ratingAvg}
        ratingCount={ratingCount}
      />

      <PromotionalBanner
        shopSlug={shop.slug}
        title="Browse All Products"
        description="Discover the complete collection from this shop with advanced filtering options"
        ctaText="View All Products"
      />

      <div className="max-w-xl py-6">
        <ShopRatingSection
          shopId={shop.id}
          ratingAvg={ratingAvg}
          ratingCount={ratingCount}
          initialMyStars={ratingViewer.myStars}
          viewer={ratingViewer.kind}
          signInNextPath={`/shop/${shop.slug}`}
        />
      </div>

      <Separator className="my-8" />

      <ShopBlogSection shopId={shop.id} shopSlug={shop.slug} />

      <Separator className="my-8" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12">
        <aside className="lg:col-span-2 space-y-6 order-2 lg:order-1">
          {shop.description && (
            <div>
              <h2 className="text-lg font-bold mb-2">About {shop.name}</h2>
              <p className="text-muted-foreground whitespace-pre-line">{shop.description}</p>
            </div>
          )}

          <div>
            <h2 className="text-lg font-bold mb-3">Contact Information</h2>
            <div className="space-y-2">
              {shop.location && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 shrink-0 mt-1 text-muted-foreground" />
                  <span className="text-sm">{shop.location}</span>
                </div>
              )}
              {shop.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 shrink-0 mt-1 text-muted-foreground" />
                  <span className="text-sm">{shop.phone}</span>
                </div>
              )}
            </div>
          </div>

          {shop.delivery_policy && (
            <div>
              <h2 className="text-lg font-bold mb-2">Delivery & Returns</h2>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{shop.delivery_policy}</p>
            </div>
          )}
        </aside>

        <div className="lg:col-span-1 space-y-6 order-1 lg:order-2">
          {paymentMethods && paymentMethods.length > 0 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold mb-3">Payment Methods</h2>
                <div className="space-y-2">
                  {paymentMethods.map((pm) => (
                    <div key={pm.id} className="text-sm flex items-start gap-2">
                      {pm.type === "cash" ? (
                        <Banknote className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                      ) : (
                        <Landmark className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                      )}
                      <div>
                        <span className="font-medium">{pm.name}</span>
                        {pm.description && (
                          <span className="text-muted-foreground block text-xs mt-0.5">{pm.description}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
