"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AttributeType = "select" | "color" | "text";

export type AttributeItem = {
  id: string;
  attribute_id: string;
  value: string;
  color_code: string | null;
  sort_order: number;
  created_at: string;
};

export type Attribute = {
  id: string;
  shop_id: string;
  name: string;
  attribute_type: AttributeType;
  created_at: string;
  items?: AttributeItem[];
};

export async function getShopAttributes(shopId: string): Promise<Attribute[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("attributes")
    .select("*, items:attribute_items(id, attribute_id, value, color_code, sort_order, created_at)")
    .eq("shop_id", shopId)
    .order("name");
  return (data ?? []) as Attribute[];
}

export async function createAttribute(
  shopId: string,
  input: { name: string; attribute_type: AttributeType }
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

  const { data, error } = await supabase
    .from("attributes")
    .insert({ shop_id: shopId, name: input.name, attribute_type: input.attribute_type })
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath(`/vendor/${shop.slug}/products/attributes`);
  return { data };
}

export async function updateAttribute(
  attributeId: string,
  input: { name?: string; attribute_type?: AttributeType }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: existing } = await supabase
    .from("attributes")
    .select("shop_id, shops(owner_id, slug)")
    .eq("id", attributeId)
    .single();
  if (!existing) return { error: "Not found" };
  const shop = existing.shops as { owner_id: string; slug: string } | null;
  if (!shop || shop.owner_id !== user.id) return { error: "Unauthorized" };

  const { data, error } = await supabase
    .from("attributes")
    .update(input)
    .eq("id", attributeId)
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath(`/vendor/${shop.slug}/products/attributes`);
  return { data };
}

export async function deleteAttribute(attributeId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: existing } = await supabase
    .from("attributes")
    .select("shop_id, shops(owner_id, slug)")
    .eq("id", attributeId)
    .single();
  if (!existing) return { error: "Not found" };
  const shop = existing.shops as { owner_id: string; slug: string } | null;
  if (!shop || shop.owner_id !== user.id) return { error: "Unauthorized" };

  const { error } = await supabase.from("attributes").delete().eq("id", attributeId);
  if (error) return { error: error.message };
  revalidatePath(`/vendor/${shop.slug}/products/attributes`);
  return { success: true };
}

export async function createAttributeItem(
  attributeId: string,
  input: { value: string; color_code?: string; sort_order?: number }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: attr } = await supabase
    .from("attributes")
    .select("shop_id, shops(owner_id)")
    .eq("id", attributeId)
    .single();
  if (!attr) return { error: "Attribute not found" };
  const shop = attr.shops as { owner_id: string } | null;
  if (!shop || shop.owner_id !== user.id) return { error: "Unauthorized" };

  const { data, error } = await supabase
    .from("attribute_items")
    .insert({
      attribute_id: attributeId,
      value: input.value,
      color_code: input.color_code ?? null,
      sort_order: input.sort_order ?? 0,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { data };
}

export async function updateAttributeItem(
  itemId: string,
  input: { value?: string; color_code?: string | null; sort_order?: number }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: existing } = await supabase
    .from("attribute_items")
    .select("attribute_id, attributes(shop_id, shops(owner_id))")
    .eq("id", itemId)
    .single();
  if (!existing) return { error: "Not found" };
  const attr = existing.attributes as { shop_id: string; shops: { owner_id: string } | null } | null;
  if (!attr?.shops || attr.shops.owner_id !== user.id) return { error: "Unauthorized" };

  const { data, error } = await supabase
    .from("attribute_items")
    .update(input)
    .eq("id", itemId)
    .select()
    .single();

  if (error) return { error: error.message };
  return { data };
}

export async function deleteAttributeItem(itemId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: existing } = await supabase
    .from("attribute_items")
    .select("attribute_id, attributes(shop_id, shops(owner_id))")
    .eq("id", itemId)
    .single();
  if (!existing) return { error: "Not found" };
  const attr = existing.attributes as { shop_id: string; shops: { owner_id: string } | null } | null;
  if (!attr?.shops || attr.shops.owner_id !== user.id) return { error: "Unauthorized" };

  const { error } = await supabase.from("attribute_items").delete().eq("id", itemId);
  if (error) return { error: error.message };
  return { success: true };
}

export async function reorderAttributeItems(
  attributeId: string,
  orderedIds: string[]
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: attr } = await supabase
    .from("attributes")
    .select("shop_id, shops(owner_id)")
    .eq("id", attributeId)
    .single();
  if (!attr) return { error: "Attribute not found" };
  const shop = attr.shops as { owner_id: string } | null;
  if (!shop || shop.owner_id !== user.id) return { error: "Unauthorized" };

  for (let i = 0; i < orderedIds.length; i++) {
    await supabase
      .from("attribute_items")
      .update({ sort_order: i })
      .eq("id", orderedIds[i]);
  }

  return { success: true };
}
