"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";

export type Category = {
  id: string;
  shop_id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  description: string | null;
  created_at: string;
  parent?: { id: string; name: string } | null;
};

export async function getShopCategories(shopId: string): Promise<Category[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("*, parent:parent_id(id, name)")
    .eq("shop_id", shopId)
    .order("name");
  return (data ?? []) as Category[];
}

export async function createCategory(
  shopId: string,
  input: { name: string; parent_id?: string | null; description?: string }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: shop } = await supabase
    .from("shops")
    .select("owner_id, slug")
    .eq("id", shopId)
    .single();
  if (!shop || shop.owner_id !== user.id) return { error: "Unauthorized" };

  const baseSlug = slugify(input.name);
  let slug = baseSlug;
  let attempt = 0;
  while (true) {
    const { data: existing } = await supabase
      .from("categories")
      .select("id")
      .eq("shop_id", shopId)
      .eq("slug", slug)
      .maybeSingle();
    if (!existing) break;
    attempt++;
    slug = `${baseSlug}-${attempt}`;
  }

  const { data, error } = await supabase
    .from("categories")
    .insert({
      shop_id: shopId,
      name: input.name,
      slug,
      parent_id: input.parent_id ?? null,
      description: input.description ?? null,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath(`/vendor/${shop.slug}/products/categories`);
  return { data };
}

export async function updateCategory(
  categoryId: string,
  input: { name?: string; slug?: string; parent_id?: string | null; description?: string }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: existing } = await supabase
    .from("categories")
    .select("shop_id, shops(owner_id, slug)")
    .eq("id", categoryId)
    .single();
  if (!existing) return { error: "Not found" };
  const shop = existing.shops as { owner_id: string; slug: string } | null;
  if (!shop || shop.owner_id !== user.id) return { error: "Unauthorized" };

  const updates: Record<string, unknown> = {};
  if (input.name !== undefined) updates.name = input.name;
  if (input.slug !== undefined) updates.slug = input.slug;
  if (input.parent_id !== undefined) updates.parent_id = input.parent_id;
  if (input.description !== undefined) updates.description = input.description;
  if (input.name && !input.slug) updates.slug = slugify(input.name);

  const { data, error } = await supabase
    .from("categories")
    .update(updates)
    .eq("id", categoryId)
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath(`/vendor/${shop.slug}/products/categories`);
  return { data };
}

export async function deleteCategory(categoryId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: existing } = await supabase
    .from("categories")
    .select("shop_id, shops(owner_id, slug)")
    .eq("id", categoryId)
    .single();
  if (!existing) return { error: "Not found" };
  const shop = existing.shops as { owner_id: string; slug: string } | null;
  if (!shop || shop.owner_id !== user.id) return { error: "Unauthorized" };

  const { error } = await supabase.from("categories").delete().eq("id", categoryId);
  if (error) return { error: error.message };
  revalidatePath(`/vendor/${shop.slug}/products/categories`);
  return { success: true };
}

export async function setProductCategories(productId: string, categoryIds: string[]) {
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

  await supabase.from("product_categories").delete().eq("product_id", productId);

  if (categoryIds.length > 0) {
    const { error } = await supabase.from("product_categories").insert(
      categoryIds.map((category_id) => ({ product_id: productId, category_id }))
    );
    if (error) return { error: error.message };
  }

  return { success: true };
}

export async function getProductCategories(productId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("product_categories")
    .select("category_id")
    .eq("product_id", productId);
  return (data ?? []).map((r) => r.category_id);
}
