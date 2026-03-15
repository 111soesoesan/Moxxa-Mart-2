import { notFound } from "next/navigation";
import Image from "next/image";
import { getShopBySlug } from "@/actions/shops";
import { getPublicProducts, getShopProductsForDirectAccess } from "@/actions/products";
import { ProductCard } from "@/components/shared/ProductCard";
import { ProductFilters } from "@/components/filters/ProductFilters";
import { ShopBannerSection } from "@/components/shop/ShopBannerSection";
import { ShopBlogSection } from "@/components/shop/ShopBlogSection";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { MapPin, Phone, AlertCircle } from "lucide-react";

type Props = { params: Promise<{ slug: string }>, searchParams: Promise<{ minPrice?: string; maxPrice?: string; condition?: string | string[]; inStock?: string; sort?: string }> };

export default async function ShopPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const shop = await getShopBySlug(slug);
  if (!shop) notFound();

  // Parse filter params
  const params2 = await searchParams;
  const minPrice = params2.minPrice ? parseInt(params2.minPrice) : undefined;
  const maxPrice = params2.maxPrice ? parseInt(params2.maxPrice) : undefined;
  const condition = params2.condition ? (Array.isArray(params2.condition) ? params2.condition : [params2.condition]) : undefined;
  const inStock = params2.inStock === "true";
  const sort = (params2.sort as "newest" | "price-low-high" | "price-high-low") || "newest";

  const products = await getShopProductsForDirectAccess({ shopId: shop.id, limit: 40, minPrice, maxPrice, condition, inStock, sort });

  const paymentInfo = shop.payment_info as Record<string, string> | null;

  // Show warning if shop is not active
  const isApproved = shop.status === "active";

  return (
    <div>
      <div className="relative h-48 md:h-64 bg-gradient-to-br from-primary/10 to-primary/30">
        {shop.cover_url && (
          <Image src={shop.cover_url} alt={shop.name} fill className="object-cover" priority sizes="100vw" />
        )}
      </div>

      <div className="container mx-auto px-4">
        <div className="flex items-end gap-4 -mt-10 mb-6">
          <Avatar className="h-20 w-20 border-4 border-background shadow-md">
            <AvatarImage src={shop.logo_url ?? undefined} alt={shop.name} />
            <AvatarFallback className="text-2xl">{shop.name[0]}</AvatarFallback>
          </Avatar>
          <div className="pb-1">
            <h1 className="text-2xl font-bold">{shop.name}</h1>
            <div className="flex gap-2 items-center">
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

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <ProductFilters />
          </div>

          <div className="lg:col-span-3">
            {products.length === 0 ? (
              <p className="text-muted-foreground py-10 text-center">No products listed yet.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {products.map((p) => (
                  <ProductCard key={p.id} product={{ ...p, shops: { name: shop.name, slug: shop.slug } }} />
                ))}
              </div>
            )}
          </div>
        </div>

        <Separator className="my-8" />

        {/* Shop Additional Sections */}
        <div className="mb-8">
          <ShopBannerSection
            title={`${shop.name}'s Special Offers`}
            description="Check out featured items and promotions"
            bannerUrl={shop.cover_url ?? undefined}
          />
          <ShopBlogSection />
        </div>

        <Separator className="my-8" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <aside className="lg:col-span-2 space-y-4">
            {shop.description && (
              <div>
                <p className="font-semibold text-sm mb-1">About</p>
                <p className="text-sm text-muted-foreground">{shop.description}</p>
              </div>
            )}
            {shop.location && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0" />
                <span>{shop.location}</span>
              </div>
            )}
            {shop.phone && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4 shrink-0" />
                <span>{shop.phone}</span>
              </div>
            )}
            {shop.delivery_policy && (
              <div>
                <p className="font-semibold text-sm mb-1">Delivery & Returns</p>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{shop.delivery_policy}</p>
              </div>
            )}
          </aside>

          {paymentInfo && Object.keys(paymentInfo).length > 0 && (
            <div>
              <p className="font-semibold text-sm mb-3">Payment Methods</p>
              {Object.entries(paymentInfo).map(([method, detail]) => (
                <div key={method} className="text-sm mb-2">
                  <span className="font-medium">{method}:</span>{" "}
                  <span className="text-muted-foreground">{detail}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
