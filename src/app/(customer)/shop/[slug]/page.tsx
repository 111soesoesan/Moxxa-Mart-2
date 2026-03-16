import { notFound } from "next/navigation";
import Image from "next/image";
import { getShopBySlug } from "@/actions/shops";
import { getPublicProducts } from "@/actions/products";
import { ShopSecondaryNav } from "@/components/shop/ShopSecondaryNav";
import { LatestProductsSection } from "@/components/shop/LatestProductsSection";
import { PromotionalBanner } from "@/components/shop/PromotionalBanner";
import { ShopBlogSection } from "@/components/shop/ShopBlogSection";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { MapPin, Phone, AlertCircle } from "lucide-react";

type Props = { params: Promise<{ slug: string }> };

export default async function ShopPage({ params }: Props) {
  const { slug } = await params;
  const shop = await getShopBySlug(slug);
  if (!shop) notFound();

  // Get only the latest 8 products for the landing page
  const latestProducts = await getPublicProducts({ shopId: shop.id, limit: 8, sort: "newest" });

  const paymentInfo = shop.payment_info as Record<string, string> | null;
  const isApproved = shop.status === "active";

  return (
    <div>
      {/* Shop Header */}
      <div className="relative h-48 md:h-64 bg-gradient-to-br from-primary/10 to-primary/30">
        {shop.cover_url && (
          <Image src={shop.cover_url} alt={shop.name} fill className="object-cover" priority sizes="100vw" />
        )}
      </div>

      {/* Shop Info Section */}
      <div className="bg-background border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-end gap-4 -mt-10 mb-6 pt-4">
            <Avatar className="h-20 w-20 border-4 border-background shadow-md">
              <AvatarImage src={shop.logo_url ?? undefined} alt={shop.name} />
              <AvatarFallback className="text-2xl">{shop.name[0]}</AvatarFallback>
            </Avatar>
            <div className="pb-1 flex-1">
              <h1 className="text-2xl font-bold">{shop.name}</h1>
              <div className="flex gap-2 items-center mt-2">
                {shop.allow_guest_purchase && (
                  <Badge variant="secondary" className="text-xs">Guest Purchase Allowed</Badge>
                )}
                {!isApproved && (
                  <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-800 border-yellow-200">
                    {shop.status === "pending" ? "Pending Review" : "Draft"}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {!isApproved && (
            <Alert className="mb-6 border-yellow-200 bg-yellow-50">
              <AlertCircle className="h-4 w-4 text-yellow-800" />
              <AlertDescription className="text-sm text-yellow-800">
                This shop is {shop.status === "pending" ? "pending approval" : "not yet published"}. You can view products, but purchases may not be available yet.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>

      {/* Secondary Navigation */}
      <ShopSecondaryNav shopSlug={shop.slug} />

      {/* Main Content */}
      <div className="container mx-auto px-4">
        {/* Latest Products Section */}
        <LatestProductsSection
          products={latestProducts}
          shopName={shop.name}
          shopSlug={shop.slug}
        />

        {/* Promotional Banner */}
        <PromotionalBanner
          shopSlug={shop.slug}
          title="Browse All Products"
          description="Discover the complete collection from this shop with advanced filtering options"
          ctaText="View All Products"
        />

        <Separator className="my-8" />

        {/* Blog Section */}
        <ShopBlogSection shopId={shop.id} shopSlug={shop.slug} />

        <Separator className="my-8" />

        {/* Shop Information */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12">
          <aside className="lg:col-span-2 space-y-6">
            {shop.description && (
              <div>
                <h2 className="text-lg font-bold mb-2">About {shop.name}</h2>
                <p className="text-muted-foreground whitespace-pre-line">{shop.description}</p>
              </div>
            )}

            {/* Contact Information */}
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

          {/* Sidebar - Payment Methods */}
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
    </div>
  );
}
