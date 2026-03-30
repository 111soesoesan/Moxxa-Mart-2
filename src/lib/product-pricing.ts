export type VariationPriceFields = {
  price: number | null;
  sale_price: number | null;
};

/** Minimal variation row embedded on catalog queries */
export type CatalogVariationRow = {
  id: string;
  is_active: boolean;
  stock_quantity: number;
  price: number | null;
  sale_price: number | null;
  /** When false, SKU ignores stock (parent track_inventory must still be true). */
  track_inventory?: boolean | null;
  attribute_combination?: Record<string, string> | null;
};

/** Shape required to compute display_price / display_in_stock (listing + ProductCard) */
export type CatalogProductBase = {
  id: string;
  name: string;
  price: number;
  stock: number;
  condition: string;
  image_urls: string[];
  product_type?: string | null;
  track_inventory?: boolean | null;
  product_variations?: CatalogVariationRow[] | null;
  category?: string | null;
  shops?: unknown;
};

export function effectiveVariationUnitPrice(v: VariationPriceFields): number {
  const sale = v.sale_price != null ? Number(v.sale_price) : NaN;
  if (!Number.isNaN(sale) && sale >= 0) return sale;
  return Number(v.price ?? 0);
}

/** Unit price for a simple product row (sale when set). */
export function effectiveSimpleUnitPrice(p: { price: number; sale_price?: number | null }): number {
  const sale = p.sale_price != null ? Number(p.sale_price) : NaN;
  if (!Number.isNaN(sale) && sale >= 0) return sale;
  return Number(p.price ?? 0);
}

/** Listing/card helpers: min "from" price and in-stock for variable vs simple */
export function enrichCatalogProduct<P extends CatalogProductBase>(p: P): P & {
  display_price: number;
  display_in_stock: boolean;
} {
  const product_type = String(p.product_type ?? "simple");
  const track = Boolean(p.track_inventory);
  const vars = p.product_variations ?? [];

  if (product_type === "variable") {
    const active = vars.filter((v) => v.is_active);
    const unitPrices = active
      .map((v) => effectiveVariationUnitPrice(v))
      .filter((n) => n > 0);
    const display_price = unitPrices.length > 0 ? Math.min(...unitPrices) : 0;
    const skuTracked = (v: CatalogVariationRow) => track && v.track_inventory !== false;
    const display_in_stock = active.some((v) => !skuTracked(v) || v.stock_quantity > 0);
    return { ...p, display_price, display_in_stock };
  }

  const display_price = Number(p.price ?? 0);
  const display_in_stock = !track || Number(p.stock ?? 0) > 0;
  return { ...p, display_price, display_in_stock };
}
