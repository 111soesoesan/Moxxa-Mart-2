"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { TablesInsert, TablesUpdate } from "@/types/supabase";

type PaymentMethodInsert = TablesInsert<"payment_methods">;
type PaymentMethodUpdate = TablesUpdate<"payment_methods">;

export type PaymentMethodFormData = Omit<PaymentMethodInsert, "shop_id">;

export async function getShopPaymentMethods(shopId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated", data: null };

  const { data: shop } = await supabase
    .from("shops")
    .select("owner_id")
    .eq("id", shopId)
    .single();

  if (!shop || shop.owner_id !== user.id) return { error: "Unauthorized", data: null };

  const { data, error } = await supabase
    .from("payment_methods")
    .select("*")
    .eq("shop_id", shopId)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message, data: null };
  return { data, error: null };
}

export async function getShopPaymentMethodsForCustomers(shopId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("payment_methods")
    .select("*")
    .eq("shop_id", shopId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message, data: null };
  return { data, error: null };
}

export async function createPaymentMethod(
  shopId: string,
  data: PaymentMethodFormData
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

  const { data: paymentMethod, error } = await supabase
    .from("payment_methods")
    .insert({ ...data, shop_id: shopId })
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath(`/vendor/${shop.slug}/payment-methods`);
  return { data: paymentMethod };
}

export async function updatePaymentMethod(
  methodId: string,
  data: PaymentMethodUpdate
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: method, error: fetchError } = await supabase
    .from("payment_methods")
    .select("shop_id, shops(owner_id, slug)")
    .eq("id", methodId)
    .single();

  if (fetchError || !method) return { error: "Payment method not found" };
  const shop = method.shops as { owner_id: string; slug: string } | null;
  if (!shop || shop.owner_id !== user.id) return { error: "Unauthorized" };

  const { data: updated, error } = await supabase
    .from("payment_methods")
    .update(data)
    .eq("id", methodId)
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath(`/vendor/${shop.slug}/payment-methods`);
  return { data: updated };
}

export async function deletePaymentMethod(methodId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: method, error: fetchError } = await supabase
    .from("payment_methods")
    .select("shop_id, shops(owner_id, slug)")
    .eq("id", methodId)
    .single();

  if (fetchError || !method) return { error: "Payment method not found" };
  const shop = method.shops as { owner_id: string; slug: string } | null;
  if (!shop || shop.owner_id !== user.id) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("payment_methods")
    .delete()
    .eq("id", methodId);

  if (error) return { error: error.message };
  revalidatePath(`/vendor/${shop.slug}/payment-methods`);
  return { success: true };
}

export async function getPaymentMethodById(methodId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("payment_methods")
    .select("*")
    .eq("id", methodId)
    .single();
  return data;
}
