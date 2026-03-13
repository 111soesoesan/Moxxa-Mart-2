"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export type ProductFormData = {
  name: string;
  slug: string;
  description?: string;
  price: number;
  stock: number;
  category?: string;
  condition?: string;
  image_urls?: string[];
  attributes?: Record<string, string>;
  variants?: unknown[];
  list_on_marketplace?: boolean;
  is_active?: boolean;
};

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

export async function updateProduct(productId: string, data: Partial<ProductFormData>) {
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

  const { error } = await supabase.from("products").delete().eq("id", productId);
  if (error) return { error: error.message };
  revalidatePath("/vendor");
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

export async function getProductById(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("*, shops(id, name, slug, logo_url, payment_info, allow_guest_purchase, status)")
    .eq("id", id)
    .single();
  return data;
}

export async function getPublicProducts({
  category,
  shopId,
  query,
  limit = 20,
  offset = 0,
}: {
  category?: string;
  shopId?: string;
  query?: string;
  limit?: number;
  offset?: number;
}) {
  const supabase = await createClient();
  let req = supabase
    .from("products")
    .select("*, shops(id, name, slug, logo_url, status)")
    .eq("is_active", true)
    .eq("list_on_marketplace", true)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (category) req = req.eq("category", category);
  if (shopId) req = req.eq("shop_id", shopId);
  if (query) req = req.ilike("name", `%${query}%`);

  const { data } = await req;
  return (data ?? []).filter((p) => {
    const shop = p.shops as { status?: string } | null;
    return shop?.status === "active";
  });
}

export async function getTotalProductCount() {
  const supabase = await createServiceClient();
  const { count } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);
  return count ?? 0;
}
