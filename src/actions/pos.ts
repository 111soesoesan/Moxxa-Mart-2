"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getOrCreateCustomer } from "./customers";

// ─── Types ────────────────────────────────────────────────────────────────────

export type POSProductVariation = {
  id: string;
  attribute_combination: Record<string, string> | null;
  price: number;
  sale_price: number | null;
  stock_quantity: number;
  reserved_quantity: number;
  image_url: string | null;
  is_active: boolean;
  track_inventory: boolean;
};

export type POSProduct = {
  id: string;
  name: string;
  price: number;
  sale_price: number | null;
  effective_price: number;
  image_url: string | null;
  sku: string | null;
  stock: number;
  available_stock: number;
  product_type: string;
  track_inventory: boolean;
  category_ids: string[];
  variations: POSProductVariation[];
};

export type POSOrderItem = {
  product_id: string;
  variation_id: string | null;
  name: string;
  price: number;
  quantity: number;
  item_discount_amount: number;
  item_discount_type: "fixed" | "percent";
  image_url: string | null;
  variant: string | null;
};

export type POSOrderPayload = {
  shop_id: string;
  items: POSOrderItem[];
  customer_id?: string | null;
  customer_name: string;
  customer_phone?: string | null;
  customer_email?: string | null;
  customer_mode: "guest" | "customer";
  payment_method_id: string;
  payment_status: "unpaid" | "pending" | "paid";
  global_discount_amount: number;
  global_discount_type: "fixed" | "percent";
  note?: string;
};

// ─── Fetch POS product catalogue ──────────────────────────────────────────────

export async function getPOSProducts(shopId: string): Promise<POSProduct[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: shop } = await supabase
    .from("shops")
    .select("owner_id")
    .eq("id", shopId)
    .single();
  if (!shop || shop.owner_id !== user.id) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: products } = await (supabase as any)
    .from("products")
    .select(`
      id, name, price, sale_price, image_url, sku, stock,
      product_type, track_inventory, is_active,
      inventory(stock_quantity, reserved_quantity),
      product_categories(category_id),
      product_variations(
        id, attribute_combination, price, sale_price,
        stock_quantity, image_url, is_active, track_inventory,
        inventory(stock_quantity, reserved_quantity)
      )
    `)
    .eq("shop_id", shopId)
    .eq("is_active", true)
    .order("name");

  if (!products) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (products as any[]).map((p: any) => {
    const inv = Array.isArray(p.inventory) ? p.inventory[0] : p.inventory;
    const available_stock = p.track_inventory
      ? Math.max(0, (inv?.stock_quantity ?? p.stock ?? 0) - (inv?.reserved_quantity ?? 0))
      : 9999;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const variations: POSProductVariation[] = ((p.product_variations as any[]) ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((v: any) => v.is_active)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((v: any) => {
        const vInv = Array.isArray(v.inventory) ? v.inventory[0] : v.inventory;
        return {
          id: v.id,
          attribute_combination: v.attribute_combination,
          price: v.price,
          sale_price: v.sale_price,
          stock_quantity: vInv?.stock_quantity ?? v.stock_quantity ?? 0,
          reserved_quantity: vInv?.reserved_quantity ?? 0,
          image_url: v.image_url,
          is_active: v.is_active,
          track_inventory: v.track_inventory ?? true,
        };
      });

    const category_ids: string[] = ((p.product_categories as { category_id: string }[]) ?? [])
      .map((pc) => pc.category_id);

    return {
      id: p.id,
      name: p.name,
      price: p.price,
      sale_price: p.sale_price,
      effective_price: p.sale_price ?? p.price,
      image_url: p.image_url,
      sku: p.sku ?? null,
      stock: inv?.stock_quantity ?? p.stock ?? 0,
      available_stock,
      product_type: p.product_type ?? "simple",
      track_inventory: p.track_inventory ?? false,
      category_ids,
      variations,
    } as POSProduct;
  });
}

// ─── Customer search ──────────────────────────────────────────────────────────

export async function searchPOSCustomers(shopId: string, query: string) {
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
    .from("customers")
    .select("id, name, email, phone, total_orders, total_spent")
    .eq("shop_id", shopId)
    .or(`name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
    .order("last_order_at", { ascending: false, nullsFirst: false })
    .limit(10);

  return data ?? [];
}

// ─── Quick-add walk-in customer ───────────────────────────────────────────────

export async function quickAddPOSCustomer(
  shopId: string,
  input: { name: string; phone?: string; email?: string }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated", data: null };

  const { data: shop } = await supabase
    .from("shops")
    .select("owner_id")
    .eq("id", shopId)
    .single();
  if (!shop || shop.owner_id !== user.id) return { error: "Unauthorized", data: null };

  return getOrCreateCustomer(shopId, {
    name: input.name,
    phone: input.phone || undefined,
    email: input.email || undefined,
    platform: "pos",
  });
}

// ─── Create POS order ─────────────────────────────────────────────────────────

function calcItemSubtotal(items: POSOrderItem[]) {
  return items.reduce((sum, item) => {
    const lineTotal = item.price * item.quantity;
    const itemDisc =
      item.item_discount_type === "percent"
        ? lineTotal * (item.item_discount_amount / 100)
        : item.item_discount_amount;
    return sum + Math.max(0, lineTotal - Math.min(itemDisc, lineTotal));
  }, 0);
}

export async function createPOSOrder(payload: POSOrderPayload) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: shop } = await supabase
    .from("shops")
    .select("owner_id, slug")
    .eq("id", payload.shop_id)
    .single();
  if (!shop || shop.owner_id !== user.id) return { error: "Unauthorized" };

  const rawSubtotal = payload.items.reduce((s, i) => s + i.price * i.quantity, 0);
  const afterItemDiscounts = calcItemSubtotal(payload.items);
  const globalDiscount =
    payload.global_discount_type === "percent"
      ? afterItemDiscounts * (payload.global_discount_amount / 100)
      : payload.global_discount_amount;
  const total = Math.max(0, afterItemDiscounts - Math.min(globalDiscount, afterItemDiscounts));
  const discount_amount = Math.max(0, rawSubtotal - total);

  const items_snapshot = payload.items.map((i) => ({
    product_id: i.product_id,
    variation_id: i.variation_id ?? null,
    name: i.name,
    price: i.price,
    quantity: i.quantity,
    variant: i.variant ?? null,
    image_url: i.image_url ?? null,
    item_discount_amount: i.item_discount_amount,
    item_discount_type: i.item_discount_type,
  }));

  let customerId: string | undefined;
  if (payload.customer_mode === "customer" && payload.customer_id) {
    customerId = payload.customer_id;
  } else {
    const cr = await getOrCreateCustomer(payload.shop_id, {
      name: payload.customer_name,
      phone: payload.customer_phone ?? undefined,
      email: payload.customer_email ?? undefined,
      platform: "pos",
    });
    if (!cr.error && cr.data) customerId = cr.data.id;
  }

  const customer_snapshot = {
    full_name: payload.customer_name,
    phone: payload.customer_phone ?? null,
    email: payload.customer_email ?? null,
    channel: "pos",
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: order, error } = await (supabase as any)
    .from("orders")
    .insert({
      shop_id: payload.shop_id,
      user_id: user.id,
      customer_id: customerId ?? null,
      items_snapshot,
      customer_snapshot,
      subtotal: rawSubtotal,
      shipping_fee: 0,
      total,
      notes: payload.note ?? null,
      payment_method_id: payload.payment_method_id,
      payment_status: payload.payment_status,
      status: payload.payment_status === "paid" ? "confirmed" : "pending",
      source: "pos",
      discount_amount,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  const svc = await createServiceClient();
  for (const item of payload.items) {
    const vidRaw = item.variation_id?.trim() ?? "";
    const { data: product } = await svc
      .from("products")
      .select("track_inventory, product_type")
      .eq("id", item.product_id)
      .single();
    if (!product?.track_inventory) continue;

    await svc.rpc("try_reserve_inventory_line", {
      p_product_id: item.product_id,
      p_variation_id: (vidRaw || null) as unknown as string,
      p_qty: item.quantity,
    });
  }

  revalidatePath(`/vendor/${shop.slug}/orders`);
  revalidatePath(`/vendor/${shop.slug}/pos`);
  return { data: order };
}
