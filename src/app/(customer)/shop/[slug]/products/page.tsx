import { notFound } from "next/navigation";
import { getShopBySlug } from "@/actions/shops";
import { getPublicProducts } from "@/actions/products";
import { ProductCard } from "@/components/shared/ProductCard";
import { ProductFilters } from "@/components/filters/ProductFilters";
import { ShopSecondaryNav } from "@/components/shop/ShopSecondaryNav";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    minPrice?: string;
    maxPrice?: string;
    condition?: string | string[];
    inStock?: string;
    sort?: string;
  }>;
};

export default async function ShopProductsPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const shop = await getShopBySlug(slug);
  if (!shop) notFound();

  // Parse filter params
  const params2 = await searchParams;
  const minPrice = params2.minPrice ? parseInt(params2.minPrice) : undefined;
  const maxPrice = params2.maxPrice ? parseInt(params2.maxPrice) : undefined;
  const condition = params2.condition
    ? Array.isArray(params2.condition)
      ? params2.condition
      : [params2.condition]
    : undefined;
  const inStock = params2.inStock === "true";
  const sort = (params2.sort as "newest" | "price-low-high" | "price-high-low") || "newest";

  const products = await getPublicProducts({
    shopId: shop.id,
    limit: 100,
    minPrice,
    maxPrice,
    condition,
    inStock,
    sort,
  });

  return (
    <div>
      {/* Secondary Navigation */}
      <ShopSecondaryNav shopSlug={shop.slug} />

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">All Products</h1>
          <p className="text-muted-foreground">
            Browsing all products from {shop.name}
            {products.length > 0 && ` (${products.length} items)`}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <ProductFilters />
          </div>

          {/* Products Grid */}
          <div className="lg:col-span-3">
            {products.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <p className="text-lg">No products found.</p>
                <p className="text-sm mt-1">Try adjusting your filters or browse other categories.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {products.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={{
                      ...p,
                      shops: { name: shop.name, slug: shop.slug },
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="aspect-square w-full rounded-lg" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}
