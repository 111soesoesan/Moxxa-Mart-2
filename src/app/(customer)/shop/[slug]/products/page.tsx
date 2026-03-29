import { notFound } from "next/navigation";
import { getShopBySlug } from "@/actions/shops";
import { getPublicProducts } from "@/actions/products";
import { getActiveBrowseCategories } from "@/actions/browseCategories";
import { ProductCard } from "@/components/shared/ProductCard";
import { ProductFilters } from "@/components/filters/ProductFilters";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    browse?: string;
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
  const browse = params2.browse;

  const [products, browseNav] = await Promise.all([
    getPublicProducts({
      shopId: shop.id,
      browseSlug: browse,
      limit: 100,
      minPrice,
      maxPrice,
      condition,
      inStock,
      sort,
    }),
    getActiveBrowseCategories(),
  ]);

  const navItems = browseNav.map((c) => ({ slug: c.slug, name: c.name }));

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">All Products</h1>
        <p className="text-muted-foreground">
          Browsing all products from {shop.name}
          {products.length > 0 && ` (${products.length} items)`}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <ProductFilters browseCategories={navItems} />
        </div>

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
  );
}
