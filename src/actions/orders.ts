"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { CartItem } from "@/hooks/useCart";

export type GuestInfo = {
  full_name: string;
  phone: string;
  address: string;
  email?: string;
};

export type CreateOrderPayload = {
  shop_id: string;
  items: CartItem[];
  customer: GuestInfo;
  shipping_fee?: number;
  notes?: string;
};

export async function createOrder(payload: CreateOrderPayload) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const subtotal = payload.items.reduce((s, i) => s + i.price * i.quantity, 0);
  const shipping_fee = payload.shipping_fee ?? 0;
  const total = subtotal + shipping_fee;

  const items_snapshot = payload.items.map((i) => ({
    product_id: i.product_id,
    name: i.name,
    price: i.price,
    quantity: i.quantity,
    variant: i.variant ?? null,
    image_url: i.image_url ?? null,
  }));

  const { data: order, error } = await supabase
    .from("orders")
    .insert({
      shop_id: payload.shop_id,
      user_id: user?.id ?? null,
      items_snapshot,
      customer_snapshot: payload.customer,
      subtotal,
      shipping_fee,
      total,
      notes: payload.notes ?? null,
      status: "pending",
      payment_status: "unpaid",
      payment_method: "manual",
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { data: order };
}

export async function getOrderById(id: string) {
  const supabase = await createServiceClient();
  const { data } = await supabase
    .from("orders")
    .select("*, shops(id, name, slug, logo_url, payment_info, phone)")
    .eq("id", id)
    .single();
  return data;
}

export async function getMyOrders() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("orders")
    .select("*, shops(name, slug, logo_url)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return data ?? [];
}

export async function getOrdersByPhone(phone: string) {
  const supabase = await createServiceClient();
  const { data } = await supabase
    .from("orders")
    .select("*, shops(name, slug, logo_url)")
    .filter("customer_snapshot->>phone", "eq", phone)
    .order("created_at", { ascending: false })
    .limit(20);
  return data ?? [];
}

export async function submitPaymentProof(orderId: string, proofUrl: string) {
  const supabase = await createServiceClient();
  const { error } = await supabase
    .from("orders")
    .update({ payment_proof_url: proofUrl, payment_status: "pending_verification" })
    .eq("id", orderId);
  if (error) return { error: error.message };
  revalidatePath(`/orders/${orderId}`);
  return { success: true };
}

export async function getShopOrders(shopId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: shop } = await supabase
    .from("shops")
    .select("owner_id")
    .eq("id", shopId)
    .single();

  if (!shop || shop.owner_id !== user.id) return [];

  const { data } = await supabase
    .from("orders")
    .select("*")
    .eq("shop_id", shopId)
    .order("created_at", { ascending: false });

  return data ?? [];
}

export async function updateOrderStatus(orderId: string, status: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: order } = await supabase
    .from("orders")
    .select("shop_id, shops(owner_id)")
    .eq("id", orderId)
    .single();

  const shop = order?.shops as { owner_id: string } | null;
  if (!shop || shop.owner_id !== user.id) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", orderId);

  if (error) return { error: error.message };
  revalidatePath(`/vendor`);
  return { success: true };
}

export async function markOrderPaid(orderId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: order } = await supabase
    .from("orders")
    .select("shop_id, shops(owner_id)")
    .eq("id", orderId)
    .single();

  const shop = order?.shops as { owner_id: string } | null;
  if (!shop || shop.owner_id !== user.id) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("orders")
    .update({ payment_status: "paid", status: "confirmed" })
    .eq("id", orderId);

  if (error) return { error: error.message };
  revalidatePath(`/vendor`);
  return { success: true };
}

export async function getRecentOrdersStats() {
  const supabase = await createServiceClient();
  const { count } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true });
  return { total: count ?? 0 };
}
