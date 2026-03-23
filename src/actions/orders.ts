"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { CartItem } from "@/hooks/useCart";
import { effectiveVariationUnitPrice } from "@/lib/product-pricing";
import { getOrCreateCustomer, addCustomerActivity } from "./customers";

type ServiceClient = Awaited<ReturnType<typeof createServiceClient>>;

type SnapshotRestoreItem = {
  product_id: string;
  quantity: number;
  variation_id?: string | null;
};

function skuTracksInventory(
  productTracks: boolean,
  productType: string,
  variationTrack: boolean | null | undefined
): boolean {
  if (!productTracks) return false;
  if (productType === "variable") {
    return variationTrack !== false;
  }
  return true;
}

/** Pending orders: release reservations (DELETE does not fire cancel trigger). */
async function releasePendingReservationsForSnapshot(
  svc: ServiceClient,
  items: SnapshotRestoreItem[]
) {
  for (const item of items) {
    const { data: product } = await svc
      .from("products")
      .select("track_inventory, product_type")
      .eq("id", item.product_id)
      .single();
    if (!product) continue;
    const vidRaw = typeof item.variation_id === "string" ? item.variation_id.trim() : "";
    let varTrack: boolean | null | undefined = true;
    if (vidRaw) {
      const { data: pv } = await svc
        .from("product_variations")
        .select("track_inventory")
        .eq("id", vidRaw)
        .eq("product_id", item.product_id)
        .maybeSingle();
      varTrack = pv?.track_inventory ?? true;
    }
    if (!skuTracksInventory(!!product.track_inventory, product.product_type ?? "simple", varTrack)) continue;

    await svc.rpc("release_inventory_reservation_line", {
      p_product_id: item.product_id,
      p_variation_id: vidRaw || null,
      p_qty: item.quantity,
    });
  }
}

async function reserveInventoryForOrderItems(
  svc: ServiceClient,
  items: CartItem[]
): Promise<string | undefined> {
  for (const item of items) {
    const { data: product } = await svc
      .from("products")
      .select("track_inventory, product_type")
      .eq("id", item.product_id)
      .single();
    if (!product) return "Product not found";
    const vidRaw = typeof item.variation_id === "string" ? item.variation_id.trim() : "";
    let varTrack: boolean | null | undefined = true;
    if (product.product_type === "variable") {
      if (!vidRaw) return "Each variable product line must include a variation";
      const { data: pv } = await svc
        .from("product_variations")
        .select("track_inventory")
        .eq("id", vidRaw)
        .eq("product_id", item.product_id)
        .maybeSingle();
      if (!pv) return "Invalid variation";
      varTrack = pv.track_inventory ?? true;
    }
    if (!skuTracksInventory(!!product.track_inventory, product.product_type ?? "simple", varTrack)) continue;

    const { data: ok, error } = await svc.rpc("try_reserve_inventory_line", {
      p_product_id: item.product_id,
      p_variation_id: vidRaw || null,
      p_qty: item.quantity,
    });
    if (error) return error.message;
    if (!ok) return `Not enough stock available for “${item.name}”`;
  }
  return undefined;
}

/** Restores one snapshot line (variation row or simple-product inventory + products.stock). */
async function restoreInventoryForSnapshotItem(
  svc: ServiceClient,
  item: SnapshotRestoreItem,
  referenceId: string
) {
  const { data: product } = await svc
    .from("products")
    .select("track_inventory, product_type")
    .eq("id", item.product_id)
    .single();
  if (!product?.track_inventory) return;

  const vidRaw = typeof item.variation_id === "string" ? item.variation_id.trim() : "";
  if (vidRaw) {
    const { data: pv } = await svc
      .from("product_variations")
      .select("track_inventory")
      .eq("id", vidRaw)
      .eq("product_id", item.product_id)
      .maybeSingle();
    if (pv && pv.track_inventory === false) return;

    const { data: inv } = await svc
      .from("inventory")
      .select("id, stock_quantity")
      .eq("variation_id", vidRaw)
      .eq("product_id", item.product_id)
      .maybeSingle();
    if (!inv) return;
    const prev = inv.stock_quantity;
    const newQty = prev + item.quantity;
    await svc
      .from("inventory")
      .update({ stock_quantity: newQty, updated_at: new Date().toISOString() })
      .eq("id", inv.id);
    await svc.from("inventory_logs").insert({
      inventory_id: inv.id,
      change_type: "cancel",
      quantity_change: item.quantity,
      previous_quantity: prev,
      new_quantity: newQty,
      reference_id: referenceId,
    });
    return;
  }

  const { data: inv } = await svc
    .from("inventory")
    .select("id, stock_quantity")
    .eq("product_id", item.product_id)
    .is("variation_id", null)
    .maybeSingle();
  if (!inv) return;
  const prev = inv.stock_quantity;
  const newQty = prev + item.quantity;
  await svc
    .from("inventory")
    .update({ stock_quantity: newQty, updated_at: new Date().toISOString() })
    .eq("id", inv.id);
  await svc.from("products").update({ stock: newQty }).eq("id", item.product_id);
  await svc.from("inventory_logs").insert({
    inventory_id: inv.id,
    change_type: "cancel",
    quantity_change: item.quantity,
    previous_quantity: prev,
    new_quantity: newQty,
    reference_id: referenceId,
  });
}

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
  payment_method_id: string;
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
    variation_id: i.variation_id ?? null,
  }));

  // Get or create customer
  const customerResult = await getOrCreateCustomer(payload.shop_id, {
    email: payload.customer.email || `guest-${Date.now()}@marketplace.local`,
    name: payload.customer.full_name,
    phone: payload.customer.phone,
  });

  if (customerResult.error) return { error: customerResult.error };
  const customerId = customerResult.data?.id;

  const { data: order, error } = await supabase
    .from("orders")
    .insert({
      shop_id: payload.shop_id,
      user_id: user?.id ?? null,
      customer_id: customerId,
      items_snapshot,
      customer_snapshot: payload.customer,
      subtotal,
      shipping_fee,
      total,
      notes: payload.notes ?? null,
      payment_method_id: payload.payment_method_id,
      status: "pending",
      payment_status: "unpaid",
    })
    .select()
    .single();

  if (error) return { error: error.message };

  const svc = await createServiceClient();
  const reserveErr = await reserveInventoryForOrderItems(svc, payload.items);
  if (reserveErr) {
    await svc.from("orders").delete().eq("id", order.id);
    return { error: reserveErr };
  }

  // Log customer activity
  if (customerId) {
    await addCustomerActivity(
      customerId,
      "order_placed",
      `Order placed`,
      {
        orderId: order.id,
        total,
        itemsCount: payload.items.length,
      }
    );
  }

  return { data: order };
}

export async function getOrderById(id: string) {
  const supabase = await createServiceClient();
  const { data } = await supabase
    .from("orders")
    .select("*, shops(id, name, slug, logo_url, phone), payment_methods(id, name, type, bank_name, account_holder, account_number, proof_required)")
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
    .select("*, payment_methods(id, name, type, proof_required)")
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
    .select("shop_id, status, items_snapshot, shops(owner_id, slug)")
    .eq("id", orderId)
    .single();

  const shop = order?.shops as { owner_id: string; slug: string } | null;
  if (!shop || shop.owner_id !== user.id) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("orders")
    .update({ payment_status: "paid", status: "confirmed" })
    .eq("id", orderId);

  if (error) return { error: error.message };

  // Inventory deduction is handled automatically by the
  // deduct_inventory_on_confirmation DB trigger when status → 'confirmed'.

  revalidatePath(`/vendor`);
  if (shop.slug) revalidatePath(`/vendor/${shop.slug}/inventory`);
  if (shop.slug) revalidatePath(`/vendor/${shop.slug}/orders`);
  return { success: true };
}

/** COD: confirm the order (status → confirmed, triggering inventory deduction via DB trigger) */
export async function confirmCODOrder(orderId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: order } = await supabase
    .from("orders")
    .select("shop_id, status, shops(owner_id, slug)")
    .eq("id", orderId)
    .single();

  const shop = order?.shops as { owner_id: string; slug: string } | null;
  if (!shop || shop.owner_id !== user.id) return { error: "Unauthorized" };
  if (order?.status !== "pending") return { error: "Order must be in pending state to confirm" };

  const { error } = await supabase
    .from("orders")
    .update({ status: "confirmed" })
    .eq("id", orderId);

  if (error) return { error: error.message };
  revalidatePath(`/vendor`);
  if (shop.slug) revalidatePath(`/vendor/${shop.slug}/orders`);
  return { success: true };
}

/** COD: mark cash as collected (payment_status → paid) without changing order status */
export async function markCODPaid(orderId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: order } = await supabase
    .from("orders")
    .select("shop_id, status, shops(owner_id, slug)")
    .eq("id", orderId)
    .single();

  const shop = order?.shops as { owner_id: string; slug: string } | null;
  if (!shop || shop.owner_id !== user.id) return { error: "Unauthorized" };
  if (order?.status === "cancelled") return { error: "Cannot mark a cancelled order as paid" };

  const { error } = await supabase
    .from("orders")
    .update({ payment_status: "paid" })
    .eq("id", orderId);

  if (error) return { error: error.message };
  revalidatePath(`/vendor`);
  if (shop.slug) revalidatePath(`/vendor/${shop.slug}/orders`);
  return { success: true };
}

/** Delete a single order. Restores inventory if the order was confirmed. */
export async function deleteOrder(orderId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: order } = await supabase
    .from("orders")
    .select("shop_id, status, items_snapshot, shops(owner_id, slug)")
    .eq("id", orderId)
    .single();

  if (!order) return { error: "Order not found" };
  const shop = order.shops as { owner_id: string; slug: string } | null;
  if (!shop || shop.owner_id !== user.id) return { error: "Unauthorized" };

  const svc = await createServiceClient();

  const items = (order.items_snapshot ?? []) as SnapshotRestoreItem[];
  if (order.status === "pending") {
    await releasePendingReservationsForSnapshot(svc, items);
  }

  const restoreStatuses = ["confirmed", "processing", "shipped", "delivered"];
  if (order.status && restoreStatuses.includes(order.status)) {
    for (const item of items) {
      await restoreInventoryForSnapshotItem(svc, item, orderId);
    }
  }

  const { error } = await svc.from("orders").delete().eq("id", orderId);
  if (error) return { error: error.message };

  revalidatePath(`/vendor`);
  if (shop.slug) revalidatePath(`/vendor/${shop.slug}/orders`);
  return { success: true };
}

/** Bulk update order statuses for the authenticated vendor's orders. */
export async function bulkUpdateOrderStatus(orderIds: string[], status: string) {
  if (!orderIds.length) return { error: "No orders selected" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Verify ownership: all orders must belong to the current user's shops
  const { data: orders } = await supabase
    .from("orders")
    .select("id, shops(owner_id)")
    .in("id", orderIds);

  const unauthorized = (orders ?? []).some(
    (o) => (o.shops as { owner_id: string } | null)?.owner_id !== user.id
  );
  if (unauthorized) return { error: "Unauthorized" };

  const { error, count } = await supabase
    .from("orders")
    .update({ status })
    .in("id", orderIds);

  if (error) return { error: error.message };
  revalidatePath(`/vendor`);
  return { success: true, updated: count ?? orderIds.length };
}

/** Bulk delete orders. Restores inventory for confirmed/active orders. */
export async function bulkDeleteOrders(orderIds: string[]) {
  if (!orderIds.length) return { error: "No orders selected" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: orders } = await supabase
    .from("orders")
    .select("id, status, items_snapshot, shops(owner_id)")
    .in("id", orderIds);

  const unauthorized = (orders ?? []).some(
    (o) => (o.shops as { owner_id: string } | null)?.owner_id !== user.id
  );
  if (unauthorized) return { error: "Unauthorized" };

  const svc = await createServiceClient();
  const restoreStatuses = ["confirmed", "processing", "shipped", "delivered"];

  for (const order of orders ?? []) {
    const items = (order.items_snapshot ?? []) as SnapshotRestoreItem[];
    if (order.status === "pending") {
      await releasePendingReservationsForSnapshot(svc, items);
    } else if (restoreStatuses.includes(order.status)) {
      for (const item of items) {
        await restoreInventoryForSnapshotItem(svc, item, order.id);
      }
    }
  }

  const { error } = await svc.from("orders").delete().in("id", orderIds);
  if (error) return { error: error.message };

  revalidatePath(`/vendor`);
  return { success: true, deleted: orderIds.length };
}

export async function getRecentOrdersStats() {
  const supabase = await createServiceClient();
  const { count } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true });
  return { total: count ?? 0 };
}

export type CartValidationResult = {
  valid: boolean;
  issues: Array<{
    product_id: string;
    name: string;
    type: "price_changed" | "out_of_stock" | "insufficient_stock" | "unavailable";
    oldPrice?: number;
    newPrice?: number;
    requestedQty?: number;
    availableStock?: number;
  }>;
};

export async function validateCart(items: CartItem[]): Promise<CartValidationResult> {
  if (!items.length) return { valid: true, issues: [] };

  const supabase = await createServiceClient();
  const ids = [...new Set(items.map((i) => i.product_id))];
  const { data: products } = await supabase
    .from("products")
    .select("id, name, price, stock, is_active, track_inventory, product_type")
    .in("id", ids);

  const map = new Map((products ?? []).map((p) => [p.id, p]));

  const variationIds = [
    ...new Set(
      items
        .map((i) => (typeof i.variation_id === "string" ? i.variation_id.trim() : ""))
        .filter(Boolean)
    ),
  ];
  let variationRows: Array<{
    id: string;
    product_id: string;
    is_active: boolean;
    stock_quantity: number;
    price: number | null;
    sale_price: number | null;
    track_inventory: boolean | null;
  }> = [];
  if (variationIds.length > 0) {
    const { data } = await supabase
      .from("product_variations")
      .select("id, product_id, is_active, stock_quantity, price, sale_price, track_inventory")
      .in("id", variationIds);
    variationRows = (data ?? []) as typeof variationRows;
  }

  const varMap = new Map(variationRows.map((v) => [v.id, v]));

  const simpleProductIds = [
    ...new Set(items.filter((i) => !(typeof i.variation_id === "string" && i.variation_id.trim())).map((i) => i.product_id)),
  ];
  let simpleInvRows: Array<{ product_id: string; stock_quantity: number; reserved_quantity: number }> = [];
  if (simpleProductIds.length > 0) {
    const { data } = await supabase
      .from("inventory")
      .select("product_id, stock_quantity, reserved_quantity")
      .in("product_id", simpleProductIds)
      .is("variation_id", null);
    simpleInvRows = data ?? [];
  }
  const simpleInvMap = new Map(simpleInvRows.map((r) => [r.product_id, r]));

  let varInvRows: Array<{ variation_id: string; stock_quantity: number; reserved_quantity: number }> = [];
  if (variationIds.length > 0) {
    const { data } = await supabase
      .from("inventory")
      .select("variation_id, stock_quantity, reserved_quantity")
      .in("variation_id", variationIds);
    varInvRows = (data ?? []) as typeof varInvRows;
  }
  const varInvMap = new Map(varInvRows.map((r) => [r.variation_id, r]));

  const issues: CartValidationResult["issues"] = [];

  for (const item of items) {
    const live = map.get(item.product_id);
    if (!live || !live.is_active) {
      issues.push({ product_id: item.product_id, name: item.name, type: "unavailable" });
      continue;
    }

    const vid = typeof item.variation_id === "string" ? item.variation_id.trim() : "";
    const isVariable = live.product_type === "variable";

    if (isVariable) {
      if (!vid) {
        issues.push({ product_id: item.product_id, name: item.name, type: "unavailable" });
        continue;
      }
      const pv = varMap.get(vid);
      if (!pv || pv.product_id !== item.product_id) {
        issues.push({ product_id: item.product_id, name: item.name, type: "unavailable" });
        continue;
      }
      if (!pv.is_active) {
        issues.push({ product_id: item.product_id, name: item.name, type: "unavailable" });
        continue;
      }
      const tracks = skuTracksInventory(!!live.track_inventory, "variable", pv.track_inventory);
      const invRow = varInvMap.get(vid);
      const available = invRow
        ? Math.max(0, invRow.stock_quantity - (invRow.reserved_quantity ?? 0))
        : Math.max(0, pv.stock_quantity);

      if (tracks && available === 0) {
        issues.push({ product_id: item.product_id, name: item.name, type: "out_of_stock" });
        continue;
      }
      if (tracks && available < item.quantity) {
        issues.push({
          product_id: item.product_id,
          name: item.name,
          type: "insufficient_stock",
          requestedQty: item.quantity,
          availableStock: available,
        });
        continue;
      }
      const unit = effectiveVariationUnitPrice(pv);
      if (Math.abs(unit - item.price) > 0.01) {
        issues.push({
          product_id: item.product_id,
          name: item.name,
          type: "price_changed",
          oldPrice: item.price,
          newPrice: unit,
        });
      }
      continue;
    }

    if (vid) {
      issues.push({ product_id: item.product_id, name: item.name, type: "unavailable" });
      continue;
    }

    const inv = simpleInvMap.get(item.product_id);
    const available = inv
      ? Math.max(0, inv.stock_quantity - (inv.reserved_quantity ?? 0))
      : Math.max(0, live.stock);

    if (live.track_inventory && available === 0) {
      issues.push({ product_id: item.product_id, name: item.name, type: "out_of_stock" });
      continue;
    }
    if (live.track_inventory && available < item.quantity) {
      issues.push({
        product_id: item.product_id,
        name: item.name,
        type: "insufficient_stock",
        requestedQty: item.quantity,
        availableStock: available,
      });
    }
    if (Math.abs(live.price - item.price) > 0.01) {
      issues.push({
        product_id: item.product_id,
        name: item.name,
        type: "price_changed",
        oldPrice: item.price,
        newPrice: live.price,
      });
    }
  }

  return { valid: issues.length === 0, issues };
}

export async function updateOrderPaymentStatus(orderId: string, paymentStatus: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // We rely on RLS (which checks shop ownership or admin role)
  // to authorize the update safely and transparently.
  const { error, data } = await supabase
    .from("orders")
    .update({ payment_status: paymentStatus })
    .eq("id", orderId)
    .select("id, shops(slug)");

  if (error) return { error: error.message };
  if (!data || data.length === 0) return { error: "Unauthorized or order not found" };

  revalidatePath(`/vendor`);
  const shopSlug = (data[0].shops as { slug?: string } | null)?.slug;
  if (shopSlug) revalidatePath(`/vendor/${shopSlug}/orders`);
  
  return { success: true };
}
