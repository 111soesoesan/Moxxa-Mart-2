import { getPublicProducts } from "@/actions/products";
import { ProductCard } from "@/components/shared/ProductCard";

export async function CatalogProductGrid({
  query = "",
  browseSlug,
  category,
  shopId,
  minPrice,
  maxPrice,
  condition,
  inStock,
  sort,
  limit = 40,
}: {
  query?: string;
  browseSlug?: string;
  category?: string;
  shopId?: string;
  minPrice?: number;
  maxPrice?: number;
  condition?: string[];
  inStock?: boolean;
  sort?: "newest" | "price-low-high" | "price-high-low";
  limit?: number;
}) {
  const products = await getPublicProducts({
    query,
    browseSlug,
    category: !browseSlug ? category : undefined,
    shopId,
    limit,
    minPrice,
    maxPrice,
    condition,
    inStock,
    sort,
  });

  if (products.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-lg">No products found.</p>
        <p className="text-sm mt-1">Try adjusting filters or browse another category.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {products.map((p) => (
        <ProductCard
          key={p.id}
          product={{ ...p, shops: p.shops as { name: string; slug: string } | null }}
        />
      ))}
    </div>
  );
}
