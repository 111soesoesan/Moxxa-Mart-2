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
};

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
    .select("*, products(id, name, price, image_urls)")
    .eq("shop_id", shopId)
    .order("created_at", { ascending: false });

  return data ?? [];
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
    .select("*, products(id, name, price, image_urls)")
    .eq("shop_id", shopId)
    .order("stock_quantity", { ascending: true });

  // Supabase JS v2 doesn't support column-to-column comparisons — filter in JS
  return (data ?? []).filter(
    (item) => item.stock_quantity <= item.low_stock_threshold
  );
}

export async function updateInventoryManual(
  productId: string,
  newQuantity: number,
  reason: string,
  notes?: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Look up the inventory record by product_id to get the inventory UUID
  const { data: inventory } = await supabase
    .from("inventory")
    .select("id, stock_quantity, shop_id")
    .eq("product_id", productId)
    .single();

  if (!inventory) return { error: "Inventory record not found" };

  // Verify ownership
  const { data: shop } = await supabase
    .from("shops")
    .select("owner_id")
    .eq("id", inventory.shop_id)
    .single();

  if (!shop || shop.owner_id !== user.id) return { error: "Unauthorized" };

  const previousQuantity = inventory.stock_quantity;
  const quantityChange = newQuantity - previousQuantity;

  // Map UI reason to valid change_type enum: sale, manual_update, restock, cancel, reservation, return
  let changeType: string;
  if (reason === "restock" || quantityChange > 0) {
    changeType = "restock";
  } else if (reason === "return") {
    changeType = "return";
  } else {
    changeType = "manual_update";
  }

  // Update the inventory table
  const { error: updateError } = await supabase
    .from("inventory")
    .update({ stock_quantity: newQuantity })
    .eq("id", inventory.id);

  if (updateError) return { error: updateError.message };

  // Keep products.stock in sync for the existing checkout availability flow
  await supabase
    .from("products")
    .update({ stock: newQuantity })
    .eq("id", productId);

  // Log the change — use the inventory UUID, not the product UUID
  const { error: logError } = await supabase
    .from("inventory_logs")
    .insert({
      inventory_id: inventory.id,
      change_type: changeType,
      quantity_change: quantityChange,
      previous_quantity: previousQuantity,
      new_quantity: newQuantity,
      notes: notes ? `${reason}: ${notes}` : reason || null,
      created_by: user.id,
    });

  if (logError) return { error: logError.message };

  revalidatePath(`/vendor`);
  return { success: true };
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

  // inventory_logs has no shop_id/product_id — join through inventory
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
    .select("stock_quantity, low_stock_threshold")
    .eq("shop_id", shopId);

  if (!inventories) return null;

  const totalProducts = inventories.length;
  const totalStock = inventories.reduce((sum, inv) => sum + inv.stock_quantity, 0);
  const lowStockCount = inventories.filter(
    (inv) => inv.stock_quantity <= inv.low_stock_threshold
  ).length;

  return {
    totalProducts,
    totalStock,
    lowStockCount,
    averageStock: totalProducts > 0 ? totalStock / totalProducts : 0,
  };
}

export async function checkProductAvailability(productId: string, quantity: number) {
  const supabase = await createServiceClient();
  const { data: product } = await supabase
    .from("products")
    .select("stock, is_active")
    .eq("id", productId)
    .single();

  if (!product || !product.is_active) {
    return { available: false, reason: "Product not available" };
  }

  if (product.stock === 0) {
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
    .select("id, stock, is_active")
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
