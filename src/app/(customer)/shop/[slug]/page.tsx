import { notFound } from "next/navigation";
import { getShopBySlug } from "@/actions/shops";
import { getPublicProducts } from "@/actions/products";
import { LatestProductsSection } from "@/components/shop/LatestProductsSection";
import { PromotionalBanner } from "@/components/shop/PromotionalBanner";
import { ShopBlogSection } from "@/components/shop/ShopBlogSection";
import { Separator } from "@/components/ui/separator";
import { MapPin, Phone } from "lucide-react";

type Props = { params: Promise<{ slug: string }> };

export default async function ShopPage({ params }: Props) {
  const { slug } = await params;
  const shop = await getShopBySlug(slug);
  if (!shop) notFound();

  const latestProducts = await getPublicProducts({ shopId: shop.id, limit: 8, sort: "newest" });
  const paymentInfo = shop.payment_info as Record<string, string> | null;

  return (
    <div className="container mx-auto px-4">
      <LatestProductsSection
        products={latestProducts}
        shopName={shop.name}
        shopSlug={shop.slug}
      />

      <PromotionalBanner
        shopSlug={shop.slug}
        title="Browse All Products"
        description="Discover the complete collection from this shop with advanced filtering options"
        ctaText="View All Products"
      />

      <Separator className="my-8" />

      <ShopBlogSection shopId={shop.id} shopSlug={shop.slug} />

      <Separator className="my-8" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12">
        <aside className="lg:col-span-2 space-y-6">
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

        {paymentInfo && Object.keys(paymentInfo).length > 0 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold mb-3">Payment Methods</h2>
              <div className="space-y-2">
                {Object.entries(paymentInfo).map(([method, detail]) => (
                  <div key={method} className="text-sm">
                    <span className="font-medium">{method}:</span>{" "}
                    <span className="text-muted-foreground block text-xs mt-1">{detail}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
