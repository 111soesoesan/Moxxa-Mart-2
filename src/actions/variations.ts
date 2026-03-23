"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type Variation = {
  id: string;
  product_id: string;
  attribute_combination: Record<string, string>;
  sku: string | null;
  price: number | null;
  sale_price: number | null;
  stock_quantity: number;
  image_url: string | null;
  is_active: boolean;
  track_inventory: boolean;
  created_at: string;
  updated_at: string;
};

export async function getProductVariations(productId: string): Promise<Variation[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("product_variations")
    .select("*")
    .eq("product_id", productId)
    .order("created_at");
  return (data ?? []).map((v) => ({
    ...v,
    attribute_combination: (v.attribute_combination ?? {}) as Record<string, string>,
    price: v.price ? Number(v.price) : null,
    sale_price: v.sale_price ? Number(v.sale_price) : null,
    track_inventory: v.track_inventory ?? true,
  }));
}

export async function upsertVariations(
  productId: string,
  variations: Array<{
    id?: string;
    attribute_combination: Record<string, string>;
    sku?: string | null;
    price?: number | null;
    sale_price?: number | null;
    stock_quantity?: number;
    image_url?: string | null;
    is_active?: boolean;
    track_inventory?: boolean;
  }>
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: product } = await supabase
    .from("products")
    .select("shop_id, shops(owner_id, slug)")
    .eq("id", productId)
    .single();
  if (!product) return { error: "Product not found" };
  const shop = product.shops as { owner_id: string; slug: string } | null;
  if (!shop || shop.owner_id !== user.id) return { error: "Unauthorized" };

  const rows = variations.map((v) => ({
    ...(v.id ? { id: v.id } : {}),
    product_id: productId,
    attribute_combination: v.attribute_combination,
    sku: v.sku ?? null,
    price: v.price ?? null,
    sale_price: v.sale_price ?? null,
    stock_quantity: v.stock_quantity ?? 0,
    image_url: v.image_url ?? null,
    is_active: v.is_active ?? true,
    track_inventory: v.track_inventory ?? true,
  }));

  const { data, error } = await supabase
    .from("product_variations")
    .upsert(rows, { onConflict: "id" })
    .select();

  if (error) return { error: error.message };
  revalidatePath(`/vendor/${shop.slug}/products`);
  return { data };
}

export async function deleteVariation(variationId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: variation } = await supabase
    .from("product_variations")
    .select("product_id, products(shops(owner_id))")
    .eq("id", variationId)
    .single();
  if (!variation) return { error: "Not found" };
  const shop = (variation.products as { shops: { owner_id: string } | null } | null)?.shops;
  if (!shop || shop.owner_id !== user.id) return { error: "Unauthorized" };

  const { error } = await supabase.from("product_variations").delete().eq("id", variationId);
  if (error) return { error: error.message };
  return { success: true };
}

export async function deleteVariationsByProduct(productId: string, keepIds: string[] = []) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: product } = await supabase
    .from("products")
    .select("shop_id, shops(owner_id)")
    .eq("id", productId)
    .single();
  if (!product) return { error: "Product not found" };
  const shop = product.shops as { owner_id: string } | null;
  if (!shop || shop.owner_id !== user.id) return { error: "Unauthorized" };

  let query = supabase.from("product_variations").delete().eq("product_id", productId);
  if (keepIds.length > 0) {
    query = query.not("id", "in", `(${keepIds.join(",")})`);
  }
  const { error } = await query;
  if (error) return { error: error.message };
  return { success: true };
}
