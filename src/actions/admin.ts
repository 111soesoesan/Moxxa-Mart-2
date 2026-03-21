"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";

async function assertAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/");
  return user;
}

export async function getPlatformStats() {
  await assertAdmin();
  const supabase = await createServiceClient();

  const [shops, active, pending, products, orders] = await Promise.all([
    supabase.from("shops").select("*", { count: "exact", head: true }),
    supabase.from("shops").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("shops").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("products").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("orders").select("*", { count: "exact", head: true }),
  ]);

  return {
    totalShops: shops.count ?? 0,
    activeShops: active.count ?? 0,
    pendingShops: pending.count ?? 0,
    totalProducts: products.count ?? 0,
    totalOrders: orders.count ?? 0,
  };
}

export async function getPendingBillingProofs() {
  await assertAdmin();
  const supabase = await createServiceClient();
  const { data } = await supabase
    .from("billing_proofs")
    .select("*, shops(name, slug, owner_id, profiles(full_name))")
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  return data ?? [];
}

export async function verifyBillingProof(proofId: string, shopId: string) {
  await assertAdmin();
  const supabase = await createServiceClient();

  const expires = new Date();
  expires.setMonth(expires.getMonth() + 1);

  await Promise.all([
    supabase
      .from("billing_proofs")
      .update({ status: "verified", verified_at: new Date().toISOString() })
      .eq("id", proofId),
    supabase
      .from("shops")
      .update({ status: "active", subscription_expires_at: expires.toISOString() })
      .eq("id", shopId),
  ]);

  revalidatePath("/admin/billing");
  revalidatePath("/admin/shops");
  return { success: true };
}

export async function rejectBillingProof(proofId: string, notes: string) {
  await assertAdmin();
  const supabase = await createServiceClient();
  const { error } = await supabase
    .from("billing_proofs")
    .update({ status: "rejected", admin_notes: notes })
    .eq("id", proofId);
  if (error) return { error: error.message };
  revalidatePath("/admin/billing");
  return { success: true };
}

export async function submitBillingProof(shopId: string, amount: number, screenshotUrl: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("billing_proofs")
    .insert({ shop_id: shopId, amount, screenshot_url: screenshotUrl });

  if (error) return { error: error.message };
  revalidatePath(`/vendor`);
  return { success: true };
}

export async function getAllBillingProofs() {
  await assertAdmin();
  const supabase = await createServiceClient();
  const { data } = await supabase
    .from("billing_proofs")
    .select("*, shops(name, slug)")
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getAdminShopWithProducts(shopId: string) {
  await assertAdmin();
  const supabase = await createServiceClient();

  const [shopRes, productsRes] = await Promise.all([
    supabase
      .from("shops")
      .select("*, profiles(full_name, avatar_url), payment_methods(id, name, type, bank_name, account_holder, is_active)")
      .eq("id", shopId)
      .single(),
    supabase
      .from("products")
      .select("*")
      .eq("shop_id", shopId)
      .order("created_at", { ascending: false }),
  ]);

  return {
    shop: shopRes.data,
    products: productsRes.data ?? [],
  };
}

export async function getRecentOrders(limit = 10) {
  await assertAdmin();
  const supabase = await createServiceClient();
  const { data } = await supabase
    .from("orders")
    .select("*, shops(name, slug)")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}
