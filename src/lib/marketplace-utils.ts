import { type CatalogProductBase, type CatalogVariationRow } from "@/lib/product-pricing";

export type MarketplaceProductTileData = {
  id: string;
  shop_id: string;
  name: string;
  image_urls: string[];
  price: number;
  sale_price: number | null;
  stock: number;
  track_inventory: boolean;
  product_type: string | null;
  condition: string;
  category: string | null;
  created_at: string;
  display_price: number;
  display_in_stock: boolean;
  rating_avg: number | null;
  rating_count: number;
  shop_name: string | null;
  shop_slug: string | null;
  product_variations: CatalogVariationRow[];
};

export type EnrichedCatalogRow = CatalogProductBase & {
  display_price: number;
  display_in_stock: boolean;
  shop_id: string;
  created_at?: string | null;
  sale_price?: number | null;
  rating_avg?: number | null;
  rating_count?: number | null;
};

/** Shared utility to transform catalog data into the shape used by the tile component. 
 *  Calling this from server components is safe as it doesn't use hooks.
 */
export function toMarketplaceProductTileData(
  p: EnrichedCatalogRow,
  shopOverride?: { name: string; slug: string } | null
): MarketplaceProductTileData {
  const shop = shopOverride ?? (p.shops as { name: string; slug: string } | null);
  const vars = (p.product_variations ?? []).map((v) => ({
    ...v,
    attribute_combination:
      v.attribute_combination && typeof v.attribute_combination === "object"
        ? (v.attribute_combination as Record<string, string>)
        : {},
  }));
  return {
    id: p.id,
    shop_id: p.shop_id,
    name: p.name,
    image_urls: p.image_urls ?? [],
    price: Number(p.price ?? 0),
    sale_price: p.sale_price ?? null,
    stock: Number(p.stock ?? 0),
    track_inventory: Boolean(p.track_inventory),
    product_type: p.product_type ?? "simple",
    condition: p.condition,
    category: p.category ?? null,
    created_at: p.created_at ?? "",
    display_price: p.display_price,
    display_in_stock: p.display_in_stock,
    rating_avg: p.rating_avg ?? null,
    rating_count: p.rating_count ?? 0,
    shop_name: shop?.name ?? null,
    shop_slug: shop?.slug ?? null,
    product_variations: vars,
  };
}
