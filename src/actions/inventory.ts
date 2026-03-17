"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export type InventoryItem = {
  id: string;
  product_id: string;
  shop_id: string;
  stock_quantity: number;
  reserved_quantity: number;
  low_stock_threshold: number;
  sku: string | null;
  last_updated_at: string;
  created_at: string;
  updated_at: string;
  products?: {
    id: string;
    name: string;
    price: number;
    image_urls: string[] | null;
    track_inventory: boolean;
  } | null;
};

export type InventoryLog = {
  id: string;
  inventory_id: string;
  change_type: string;
  quantity_change: number;
  previous_quantity: number | null;
  new_quantity: number | null;
  reference_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  // joined
  productName?: string | null;
  productId?: string | null;
};

// ─── Read helpers ─────────────────────────────────────────────────────────────

export async function getProductInventory(productId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("inventory")
    .select("*")
    .eq("product_id", productId)
    .single();
  return data;
}

export async function getShopInventory(shopId: string) {
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
    .from("inventory")
    .select("*, products(id, name, price, image_urls, track_inventory)")
    .eq("shop_id", shopId)
    .order("created_at", { ascending: false });

  return data ?? [];
}

export async function getShopAdjustmentLogs(shopId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: shop } = await supabase
    .from("shops")
    .select("owner_id")
    .eq("id", shopId)
    .single();

  if (!shop || shop.owner_id !== user.id) return [];

  const { data: inventories } = await supabase
    .from("inventory")
    .select("id, product_id, products(id, name)")
    .eq("shop_id", shopId);

  if (!inventories || inventories.length === 0) return [];

  const inventoryIds = inventories.map((i) => i.id);

  const { data: logs } = await supabase
    .from("inventory_logs")
    .select("*")
    .in("inventory_id", inventoryIds)
    .order("created_at", { ascending: false });

  if (!logs) return [];

  return logs.map((log) => {
    const inv = inventories.find((i) => i.id === log.inventory_id);
    const prod = inv?.products as { id: string; name: string } | null;
    return {
      ...log,
      productName: prod?.name ?? null,
      productId: inv?.product_id ?? null,
    } as InventoryLog;
  });
}

export async function getLowStockProducts(shopId: string) {
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
    .from("inventory")
    .select("*, products(id, name, price, image_urls, track_inventory)")
    .eq("shop_id", shopId)
    .order("stock_quantity", { ascending: true });

  return (data ?? []).filter(
    (item) =>
      item.products?.track_inventory !== false &&
      item.stock_quantity <= item.low_stock_threshold
  );
}

export async function getInventoryStats(shopId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: shop } = await supabase
    .from("shops")
    .select("owner_id")
    .eq("id", shopId)
    .single();

  if (!shop || shop.owner_id !== user.id) return null;

  const { data: inventories } = await supabase
    .from("inventory")
    .select("stock_quantity, low_stock_threshold, products(track_inventory)")
    .eq("shop_id", shopId);

  if (!inventories) return null;

  const tracked = inventories.filter(
    (inv) => (inv.products as { track_inventory: boolean } | null)?.track_inventory !== false
  );

  const totalProducts = tracked.length;
  const totalStock = tracked.reduce((sum, inv) => sum + Math.max(0, inv.stock_quantity), 0);
  const lowStockCount = tracked.filter(
    (inv) => inv.stock_quantity <= inv.low_stock_threshold
  ).length;

  return {
    totalProducts,
    totalStock,
    lowStockCount,
    averageStock: totalProducts > 0 ? totalStock / totalProducts : 0,
  };
}

export async function getInventoryLogs(
  shopId: string,
  productId?: string,
  limit = 50,
  offset = 0
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: shop } = await supabase
    .from("shops")
    .select("owner_id")
    .eq("id", shopId)
    .single();

  if (!shop || shop.owner_id !== user.id) return [];

  let inventoryQuery = supabase
    .from("inventory")
    .select("id")
    .eq("shop_id", shopId);

  if (productId) {
    inventoryQuery = inventoryQuery.eq("product_id", productId);
  }

  const { data: inventories } = await inventoryQuery;
  if (!inventories || inventories.length === 0) return [];

  const inventoryIds = inventories.map((i) => i.id);

  const { data } = await supabase
    .from("inventory_logs")
    .select("*")
    .in("inventory_id", inventoryIds)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  return data ?? [];
}

// ─── Adjustments ──────────────────────────────────────────────────────────────

const REASON_TO_CHANGE_TYPE: Record<string, string> = {
  restock: "restock",
  customer_return: "return",
  damaged: "manual_update",
  shrinkage: "manual_update",
  correction: "manual_update",
  other: "manual_update",
};

export async function createAdjustment(
  productId: string,
  quantityChange: number,
  reason: string,
  notes?: string
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

  const { data: inventory } = await supabase
    .from("inventory")
    .select("id, stock_quantity")
    .eq("product_id", productId)
    .single();

  if (!inventory) return { error: "Inventory record not found" };

  const previousQty = inventory.stock_quantity;
  // Allow going to 0 but clamp at 0 (no negative stock in DB)
  const newQty = Math.max(0, previousQty + quantityChange);

  const { error: invErr } = await supabase
    .from("inventory")
    .update({ stock_quantity: newQty })
    .eq("id", inventory.id);
  if (invErr) return { error: invErr.message };

  await supabase.from("products").update({ stock: newQty }).eq("id", productId);

  const changeType = REASON_TO_CHANGE_TYPE[reason] ?? "manual_update";
  const logNotes = reason === "other" ? (notes ?? "Other") : [
    reason,
    notes,
  ].filter(Boolean).join(": ");

  const { error: logErr } = await supabase.from("inventory_logs").insert({
    inventory_id: inventory.id,
    change_type: changeType,
    quantity_change: quantityChange,
    previous_quantity: previousQty,
    new_quantity: newQty,
    notes: logNotes || null,
    created_by: user.id,
  });
  if (logErr) return { error: logErr.message };

  revalidatePath(`/vendor/${shop.slug}/inventory`);
  return { success: true, newQty };
}

export async function deleteAdjustment(logId: string, shopId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: shop } = await supabase
    .from("shops")
    .select("owner_id, slug")
    .eq("id", shopId)
    .single();

  if (!shop || shop.owner_id !== user.id) return { error: "Unauthorized" };

  const { data: log } = await supabase
    .from("inventory_logs")
    .select("*")
    .eq("id", logId)
    .single();

  if (!log) return { error: "Log entry not found" };

  // Restore the previous stock snapshot
  const restoreQty = log.previous_quantity ?? 0;

  const { data: inventory } = await supabase
    .from("inventory")
    .select("id, product_id")
    .eq("id", log.inventory_id)
    .single();

  if (!inventory) return { error: "Inventory record not found" };

  await supabase
    .from("inventory")
    .update({ stock_quantity: restoreQty })
    .eq("id", inventory.id);

  await supabase
    .from("products")
    .update({ stock: restoreQty })
    .eq("id", inventory.product_id);

  const { error: delErr } = await supabase
    .from("inventory_logs")
    .delete()
    .eq("id", logId);

  if (delErr) return { error: delErr.message };

  revalidatePath(`/vendor/${shop.slug}/inventory`);
  return { success: true };
}

// ─── Stock tracking toggle ────────────────────────────────────────────────────

export async function toggleInventoryTracking(productId: string, track: boolean) {
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

  const { error } = await supabase
    .from("products")
    .update({ track_inventory: track })
    .eq("id", productId);

  if (error) return { error: error.message };

  revalidatePath(`/vendor/${shop.slug}/inventory`);
  revalidatePath(`/vendor/${shop.slug}/products`);
  return { success: true };
}

export async function setManualStockStatus(productId: string, inStock: boolean) {
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

  const qty = inStock ? 1 : 0;

  const { error: prodErr } = await supabase
    .from("products")
    .update({ stock: qty })
    .eq("id", productId);
  if (prodErr) return { error: prodErr.message };

  await supabase
    .from("inventory")
    .update({ stock_quantity: qty })
    .eq("product_id", productId);

  revalidatePath(`/vendor/${shop.slug}/inventory`);
  return { success: true };
}

// ─── Manual inventory update (absolute set) ───────────────────────────────────

export async function updateInventoryManual(
  productId: string,
  newQuantity: number,
  reason: string,
  notes?: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: inventory } = await supabase
    .from("inventory")
    .select("id, stock_quantity, shop_id")
    .eq("product_id", productId)
    .single();

  if (!inventory) return { error: "Inventory record not found" };

  const { data: shop } = await supabase
    .from("shops")
    .select("owner_id")
    .eq("id", inventory.shop_id)
    .single();

  if (!shop || shop.owner_id !== user.id) return { error: "Unauthorized" };

  const previousQuantity = inventory.stock_quantity;
  const quantityChange = newQuantity - previousQuantity;

  let changeType: string;
  if (reason === "restock" || quantityChange > 0) {
    changeType = "restock";
  } else if (reason === "return") {
    changeType = "return";
  } else {
    changeType = "manual_update";
  }

  const { error: updateError } = await supabase
    .from("inventory")
    .update({ stock_quantity: newQuantity })
    .eq("id", inventory.id);

  if (updateError) return { error: updateError.message };

  await supabase.from("products").update({ stock: newQuantity }).eq("id", productId);

  await supabase.from("inventory_logs").insert({
    inventory_id: inventory.id,
    change_type: changeType,
    quantity_change: quantityChange,
    previous_quantity: previousQuantity,
    new_quantity: newQuantity,
    notes: notes ? `${reason}: ${notes}` : reason || null,
    created_by: user.id,
  });

  revalidatePath(`/vendor`);
  return { success: true };
}

// ─── Availability checks ──────────────────────────────────────────────────────

export async function checkProductAvailability(productId: string, quantity: number) {
  const supabase = await createServiceClient();
  const { data: product } = await supabase
    .from("products")
    .select("stock, is_active, track_inventory")
    .eq("id", productId)
    .single();

  if (!product || !product.is_active) {
    return { available: false, reason: "Product not available" };
  }

  // When tracking is disabled: no quantity limit; manual in/out status via stock field
  if (!product.track_inventory) {
    if (product.stock <= 0) {
      return { available: false, reason: "Out of stock" };
    }
    return { available: true, availableQuantity: null };
  }

  if (product.stock <= 0) {
    return { available: false, reason: "Out of stock" };
  }

  if (product.stock < quantity) {
    return {
      available: false,
      reason: `Only ${product.stock} in stock`,
      availableQuantity: product.stock,
    };
  }

  return { available: true, availableQuantity: product.stock };
}

export async function bulkCheckInventory(items: Array<{ productId: string; quantity: number }>) {
  const supabase = await createServiceClient();
  const productIds = items.map((i) => i.productId);

  const { data: products } = await supabase
    .from("products")
    .select("id, stock, is_active, track_inventory")
    .in("id", productIds);

  const issues: Array<{
    productId: string;
    issue: string;
    availableQuantity?: number;
  }> = [];

  for (const item of items) {
    const product = products?.find((p) => p.id === item.productId);

    if (!product || !product.is_active) {
      issues.push({ productId: item.productId, issue: "Product not available" });
      continue;
    }

    // Untracked: no quantity limit, but respect manual in/out status
    if (!product.track_inventory) {
      if (product.stock <= 0) {
        issues.push({ productId: item.productId, issue: "Out of stock" });
      }
      continue;
    }

    if (product.stock < item.quantity) {
      issues.push({
        productId: item.productId,
        issue: "Insufficient stock",
        availableQuantity: product.stock,
      });
    }
  }

  return {
    allAvailable: issues.length === 0,
    issues,
  };
}
