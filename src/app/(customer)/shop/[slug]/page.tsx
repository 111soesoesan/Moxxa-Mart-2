import { notFound } from "next/navigation";
import { format } from "date-fns";
import { getShopBySlug } from "@/actions/shops";
import { getPublicProducts } from "@/actions/products";
import { getShopPaymentMethodsForCustomers } from "@/actions/paymentMethods";
import { getViewerShopRatingState } from "@/actions/ratings";
import { LatestProductsSection } from "@/components/shop/LatestProductsSection";
import { PromotionalBanner } from "@/components/shop/PromotionalBanner";
import { ShopBlogSection } from "@/components/shop/ShopBlogSection";
import { ShopBrowseSidebar } from "@/components/shop/ShopBrowseSidebar";
import { ShopMetadataBar } from "@/components/shop/ShopMetadataBar";
import { ShopRatingSection } from "@/components/ratings/ShopRatingSection";
import { Banknote, Landmark } from "lucide-react";

type Props = { params: Promise<{ slug: string }> };

function shopOwnerDisplayName(shop: { profiles?: unknown }): string | null {
  const p = shop.profiles;
  if (!p || typeof p !== "object") return null;
  if (Array.isArray(p)) {
    const row = p[0] as { full_name?: string | null } | undefined;
    return row?.full_name?.trim() || null;
  }
  const row = p as { full_name?: string | null };
  return row.full_name?.trim() || null;
}

export default async function ShopPage({ params }: Props) {
  const { slug } = await params;
  const shop = await getShopBySlug(slug);
  if (!shop) notFound();

  const latestProducts = await getPublicProducts({ shopId: shop.id, limit: 8, sort: "newest" });
  const { data: paymentMethods } = await getShopPaymentMethodsForCustomers(shop.id);
  const ratingViewer = await getViewerShopRatingState(shop.id);

  const ratingAvg = shop.rating_avg ?? null;
  const ratingCount = shop.rating_count ?? 0;
  const establishedLabel = format(new Date(shop.created_at), "MMMM yyyy");
  const curator = shopOwnerDisplayName(shop);

  return (
    <div className="container mx-auto px-4 py-6 lg:py-10">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-8">
          <LatestProductsSection
            layout="shopHome"
            products={latestProducts}
            shopId={shop.id}
            shopName={shop.name}
            shopSlug={shop.slug}
            ratingAvg={ratingAvg}
            ratingCount={ratingCount}
          />
        </div>

        <aside className="space-y-8 lg:col-span-4">
          <ShopBrowseSidebar shopSlug={shop.slug} />
          <ShopRatingSection
            shopId={shop.id}
            ratingAvg={ratingAvg}
            ratingCount={ratingCount}
            initialMyStars={ratingViewer.myStars}
            viewer={ratingViewer.kind}
            signInNextPath={`/shop/${shop.slug}`}
          />
          <ShopBlogSection shopId={shop.id} shopSlug={shop.slug} variant="aside" />
          {paymentMethods && paymentMethods.length > 0 ? (
            <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
              <h2 className="text-base font-bold">Payment methods</h2>
              <p className="mt-1 text-xs text-muted-foreground">How you can pay this shop</p>
              <ul className="mt-4 space-y-3">
                {paymentMethods.map((pm) => (
                  <li key={pm.id} className="flex items-start gap-2 text-sm">
                    {pm.type === "cash" ? (
                      <Banknote className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <Landmark className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <div>
                      <span className="font-medium">{pm.name}</span>
                      {pm.description ? (
                        <span className="mt-0.5 block text-xs text-muted-foreground">{pm.description}</span>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>
      </div>

      <div className="mt-10">
        <PromotionalBanner
          shopSlug={shop.slug}
          title="Browse All Products"
          description="Discover the complete collection from this shop with advanced filtering options"
          ctaText="View All Products"
        />
      </div>

      <div className="mt-10 pb-12">
        <ShopMetadataBar
          location={shop.location}
          establishedLabel={establishedLabel}
          curatedBy={curator}
        />
      </div>
    </div>
  );
}
