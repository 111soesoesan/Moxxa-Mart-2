"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import {
  type CatalogProductBase,
  enrichCatalogProduct,
} from "@/lib/product-pricing";
import type { TablesInsert, TablesUpdate } from "@/types/supabase";

type ProductInsert = TablesInsert<"products">;
type ProductUpdate = TablesUpdate<"products">;

export type ProductFormData = Omit<ProductInsert, "shop_id">;


const CATALOG_VARIATION_SELECT =
  "id, is_active, stock_quantity, price, sale_price, track_inventory, attribute_combination";

const PDP_VARIATION_SELECT =
  "id, attribute_combination, price, sale_price, stock_quantity, image_url, is_active, track_inventory, inventory(stock_quantity, reserved_quantity)";

export async function createProduct(shopId: string, data: ProductFormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: shop } = await supabase
    .from("shops")
    .select("owner_id, slug")
    .eq("id", shopId)
    .single();
  if (!shop || shop.owner_id !== user.id) return { error: "Unauthorized" };

  const { data: product, error } = await supabase
    .from("products")
    .insert({ ...data, shop_id: shopId })
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath(`/vendor/${shop.slug}/products`);
  return { data: product };
}

export async function updateProduct(productId: string, data: ProductUpdate) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: product, error } = await supabase
    .from("products")
    .update(data)
    .eq("id", productId)
    .select("*, shops(owner_id, slug)")
    .single();

  if (error) return { error: error.message };
  const shop = product.shops as { owner_id: string; slug: string } | null;
  if (!shop || shop.owner_id !== user.id) return { error: "Unauthorized" };

  revalidatePath(`/vendor/${shop.slug}/products`);
  revalidatePath(`/product/${productId}`);
  return { data: product };
}

export async function deleteProduct(productId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: product } = await supabase
    .from("products")
    .select("shop_id, shops(owner_id, slug)")
    .eq("id", productId)
    .single();
  if (!product) return { error: "Not found" };
  const shop = product.shops as { owner_id: string; slug: string } | null;
  if (!shop || shop.owner_id !== user.id) return { error: "Unauthorized" };

  const { error } = await supabase.from("products").delete().eq("id", productId);
  if (error) return { error: error.message };
  revalidatePath(`/vendor/${shop.slug}/products`);
  return { success: true };
}

export async function getShopProducts(shopId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("shop_id", shopId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getShopProductsWithDetails(shopId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select(
      `*, 
      product_categories(category_id),
      product_variations(id, is_active, stock_quantity, price),
      browse_categories(id, name, slug)`
    )
    .eq("shop_id", shopId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function bulkDeleteProducts(productIds: string[]) {
  if (productIds.length === 0) return { success: true };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: products } = await supabase
    .from("products")
    .select("id, shop_id, shops(owner_id)")
    .in("id", productIds);

  const owned = (products ?? []).filter(
    (p) => (p.shops as { owner_id: string } | null)?.owner_id === user.id
  );
  if (owned.length !== productIds.length) return { error: "Unauthorized for some products" };

  const { error } = await supabase
    .from("products")
    .delete()
    .in("id", productIds);
  if (error) return { error: error.message };
  revalidatePath("/vendor");
  return { success: true };
}

export async function bulkUpdateProductBrowseCategory(
  productIds: string[],
  browseCategoryId: string | null
) {
  if (productIds.length === 0) return { success: true as const };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: products } = await supabase
    .from("products")
    .select("id, shops(owner_id)")
    .in("id", productIds);

  const owned = (products ?? []).filter(
    (p) => (p.shops as { owner_id: string } | null)?.owner_id === user.id
  );
  if (owned.length !== productIds.length) return { error: "Unauthorized for some products" };

  const { error } = await supabase
    .from("products")
    .update({ browse_category_id: browseCategoryId })
    .in("id", productIds);
  if (error) return { error: error.message };
  revalidatePath("/vendor");
  return { success: true as const };
}

export async function bulkUpdateProductStatus(productIds: string[], status: "draft" | "active" | "archived") {
  if (productIds.length === 0) return { success: true };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: products } = await supabase
    .from("products")
    .select("id, shops(owner_id)")
    .in("id", productIds);

  const owned = (products ?? []).filter(
    (p) => (p.shops as { owner_id: string } | null)?.owner_id === user.id
  );
  if (owned.length !== productIds.length) return { error: "Unauthorized for some products" };

  const isActive = status === "active";
  const { error } = await supabase
    .from("products")
    .update({ status, is_active: isActive })
    .in("id", productIds);
  if (error) return { error: error.message };
  revalidatePath("/vendor");
  return { success: true };
}

export async function getProductById(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select(
      `*, shops(id, name, slug, logo_url, profile_image_url, allow_guest_purchase, status, owner_id), product_variations(${PDP_VARIATION_SELECT})`
    )
    .eq("id", id)
    .single();
  return data;
}

export async function getPublicProducts({
  category,
  browseSlug,
  shopId,
  query,
  limit = 20,
  offset = 0,
  minPrice,
  maxPrice,
  condition,
  inStock = false,
  sort = "newest",
}: {
  /** Legacy text column on products */
  category?: string;
  /** Platform browse category slug */
  browseSlug?: string;
  shopId?: string;
  query?: string;
  limit?: number;
  offset?: number;
  minPrice?: number;
  maxPrice?: number;
  condition?: string[];
  inStock?: boolean;
  sort?: "newest" | "price-low-high" | "price-high-low";
}) {
  const supabase = await createClient();
  let browseCategoryId: string | null = null;
  if (browseSlug) {
    const { data: bc } = await supabase
      .from("browse_categories")
      .select("id")
      .eq("slug", browseSlug)
      .eq("is_active", true)
      .maybeSingle();
    browseCategoryId = bc?.id ?? null;
    if (!browseCategoryId) return [];
  }

  let req = supabase
    .from("products")
    .select(`*, shops(id, name, slug, logo_url, profile_image_url, status), product_variations(${CATALOG_VARIATION_SELECT})`)
    .eq("is_active", true)
    .eq("list_on_marketplace", true);

  if (browseCategoryId) req = req.eq("browse_category_id", browseCategoryId);
  else if (category) req = req.eq("category", category);
  if (shopId) req = req.eq("shop_id", shopId);
  if (query) req = req.ilike("name", `%${query}%`);
  // minPrice / maxPrice / inStock: applied after enrich — parent price/stock is 0 for variable products

  switch (sort) {
    case "price-low-high":
      req = req.order("price", { ascending: true });
      break;
    case "price-high-low":
      req = req.order("price", { ascending: false });
      break;
    default:
      req = req.order("created_at", { ascending: false });
  }

  req = req.range(offset, offset + limit - 1);

  const { data } = await req;
  const base = (data ?? []).filter((p) => {
    const shop = p.shops as { status?: string } | null;
    if (shop?.status !== "active") return false;
    if (condition && condition.length > 0 && !condition.includes(p.condition)) return false;
    return true;
  });

  let enriched = base.map((p) => enrichCatalogProduct(p as CatalogProductBase));

  if (minPrice !== undefined) {
    enriched = enriched.filter((p) => p.display_price >= minPrice!);
  }
  if (maxPrice !== undefined) {
    enriched = enriched.filter((p) => p.display_price <= maxPrice!);
  }
  if (inStock) {
    enriched = enriched.filter((p) => p.display_in_stock);
  }

  if (sort === "price-low-high") {
    enriched.sort((a, b) => a.display_price - b.display_price);
  } else if (sort === "price-high-low") {
    enriched.sort((a, b) => b.display_price - a.display_price);
  }

  return enriched;
}

export async function getShopProductsForDirectAccess({
  shopId,
  limit = 40,
  offset = 0,
  minPrice,
  maxPrice,
  condition,
  inStock = false,
  sort = "newest",
}: {
  shopId: string;
  limit?: number;
  offset?: number;
  minPrice?: number;
  maxPrice?: number;
  condition?: string[];
  inStock?: boolean;
  sort?: "newest" | "price-low-high" | "price-high-low";
}) {
  const supabase = await createClient();
  let req = supabase
    .from("products")
    .select(`*, shops(id, name, slug, logo_url, profile_image_url, status), product_variations(${CATALOG_VARIATION_SELECT})`)
    .eq("shop_id", shopId)
    .eq("is_active", true);

  switch (sort) {
    case "price-low-high":
      req = req.order("price", { ascending: true });
      break;
    case "price-high-low":
      req = req.order("price", { ascending: false });
      break;
    default:
      req = req.order("created_at", { ascending: false });
  }

  req = req.range(offset, offset + limit - 1);

  const { data } = await req;
  const base = (data ?? []).filter((p) => {
    if (condition && condition.length > 0 && !condition.includes(p.condition)) return false;
    return true;
  });

  let enriched = base.map((p) => enrichCatalogProduct(p as CatalogProductBase));

  if (minPrice !== undefined) {
    enriched = enriched.filter((p) => p.display_price >= minPrice!);
  }
  if (maxPrice !== undefined) {
    enriched = enriched.filter((p) => p.display_price <= maxPrice!);
  }
  if (inStock) {
    enriched = enriched.filter((p) => p.display_in_stock);
  }

  if (sort === "price-low-high") {
    enriched.sort((a, b) => a.display_price - b.display_price);
  } else if (sort === "price-high-low") {
    enriched.sort((a, b) => b.display_price - a.display_price);
  }

  return enriched;
}

export async function getTotalProductCount() {
  const supabase = await createServiceClient();
  const { count } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);
  return count ?? 0;
}
