"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export type ShopFormData = {
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  cover_url?: string;
  phone?: string;
  location?: string;
  delivery_policy?: string;
  payment_info?: Record<string, string>;
  allow_guest_purchase?: boolean;
};

export async function createShop(data: ShopFormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: shop, error } = await supabase
    .from("shops")
    .insert({ ...data, owner_id: user.id, status: "draft" })
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath("/vendor");
  return { data: shop };
}

export async function updateShop(shopId: string, data: Partial<ShopFormData>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: shop, error } = await supabase
    .from("shops")
    .update(data)
    .eq("id", shopId)
    .eq("owner_id", user.id)
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath(`/vendor/${shop.slug}`);
  return { data: shop };
}

export async function requestInspection(shopId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: productCount } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("shop_id", shopId);

  const count = (productCount as unknown as number) ?? 0;
  if (count < 3) return { error: "You need at least 3 products before requesting inspection." };

  const { error } = await supabase
    .from("shops")
    .update({ status: "pending", inspection_requested_at: new Date().toISOString() })
    .eq("id", shopId)
    .eq("owner_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/vendor");
  return { success: true };
}

export async function getMyShops() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("shops")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  return data ?? [];
}

export async function getShopBySlug(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("shops")
    .select("*, profiles(full_name, avatar_url)")
    .eq("slug", slug)
    .single();
  return data;
}

export async function getShopById(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("shops").select("*").eq("id", id).single();
  return data;
}

export async function getActiveShops(limit = 12, offset = 0) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("shops")
    .select("*")
    .eq("status", "active")
    .range(offset, offset + limit - 1)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getPendingShops() {
  const supabase = await createServiceClient();
  const { data } = await supabase
    .from("shops")
    .select("*, profiles(full_name, avatar_url)")
    .eq("status", "pending")
    .order("inspection_requested_at", { ascending: true });
  return data ?? [];
}

export async function approveShop(shopId: string) {
  const supabase = await createServiceClient();
  const { error } = await supabase
    .from("shops")
    .update({ status: "active" })
    .eq("id", shopId);
  if (error) return { error: error.message };
  revalidatePath("/admin/shops");
  return { success: true };
}

export async function rejectShop(shopId: string, reason: string) {
  const supabase = await createServiceClient();
  const { error } = await supabase
    .from("shops")
    .update({ status: "rejected", rejection_reason: reason })
    .eq("id", shopId);
  if (error) return { error: error.message };
  revalidatePath("/admin/shops");
  return { success: true };
}

export async function getAllShopsStats() {
  const supabase = await createServiceClient();
  const { count: total } = await supabase.from("shops").select("*", { count: "exact", head: true });
  const { count: active } = await supabase.from("shops").select("*", { count: "exact", head: true }).eq("status", "active");
  const { count: pending } = await supabase.from("shops").select("*", { count: "exact", head: true }).eq("status", "pending");
  return { total: total ?? 0, active: active ?? 0, pending: pending ?? 0 };
}

export async function searchShops(query: string, limit = 8) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("shops")
    .select("*")
    .eq("status", "active")
    .ilike("name", `%${query}%`)
    .limit(limit);
  return data ?? [];
}
