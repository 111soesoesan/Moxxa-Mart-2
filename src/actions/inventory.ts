"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export type InventoryLog = {
  id: string;
  product_id: string;
  shop_id: string;
  change_type: string;
  quantity_change: number;
  before_quantity: number;
  after_quantity: number;
  metadata: Record<string, any> | null;
  created_at: string;
  created_by: string | null;
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
    .filter("stock_quantity", "lte", `low_stock_threshold`)
    .order("stock_quantity", { ascending: true });

  return data ?? [];
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

  // Get current inventory
  const { data: product } = await supabase
    .from("products")
    .select("shop_id, stock")
    .eq("id", productId)
    .single();

  if (!product) return { error: "Product not found" };

  const { data: shop } = await supabase
    .from("shops")
    .select("owner_id")
    .eq("id", product.shop_id)
    .single();

  if (!shop || shop.owner_id !== user.id) return { error: "Unauthorized" };

  const quantityChange = newQuantity - product.stock;

  // Update product stock
  const { error: updateError } = await supabase
    .from("products")
    .update({ stock: newQuantity })
    .eq("id", productId);

  if (updateError) return { error: updateError.message };

  // Log the change
  const { error: logError } = await supabase
    .from("inventory_logs")
    .insert({
      inventory_id: productId, // Using product_id as inventory_id
      change_type: "manual_adjustment",
      quantity_change: quantityChange,
      previous_quantity: product.stock,
      new_quantity: newQuantity,
      notes: reason ? `${reason}: ${notes || ""}` : notes || null,
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

  let req = supabase
    .from("inventory_logs")
    .select("*")
    .eq("shop_id", shopId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (productId) {
    req = req.eq("product_id", productId);
  }

  const { data } = await req;
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

  // Get inventory stats
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
        issue: `Insufficient stock`,
        availableQuantity: product.stock,
      });
    }
  }

  return {
    allAvailable: issues.length === 0,
    issues,
  };
}
