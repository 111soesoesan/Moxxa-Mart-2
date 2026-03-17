"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export type Customer = {
  id: string;
  shop_id: string;
  email: string | null;
  name: string;
  phone: string | null;
  total_orders: number;
  total_spent: number;
  first_order_at: string | null;
  last_order_at: string | null;
  user_id: string | null;
  created_at: string;
  updated_at: string;
};

export type CustomerActivity = {
  id: string;
  customer_id: string;
  activity_type: string;
  description: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
};

export async function getShopCustomers(
  shopId: string,
  options?: {
    search?: string;
    sortBy?: "name" | "last_order_at" | "total_spent";
    sortOrder?: "asc" | "desc";
    limit?: number;
    offset?: number;
  }
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
    .from("customers")
    .select("*")
    .eq("shop_id", shopId);

  if (options?.search) {
    req = req.or(`email.ilike.%${options.search}%,name.ilike.%${options.search}%`);
  }

  const sortBy = options?.sortBy || "last_order_at";
  const ascending = options?.sortOrder === "asc";
  req = req.order(sortBy, { ascending });

  const limit = options?.limit || 20;
  const offset = options?.offset || 0;
  req = req.range(offset, offset + limit - 1);

  const { data } = await req;
  return data ?? [];
}

export async function getCustomerById(customerId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: customer } = await supabase
    .from("customers")
    .select("*")
    .eq("id", customerId)
    .single();

  if (!customer) return null;

  const { data: shop } = await supabase
    .from("shops")
    .select("owner_id")
    .eq("id", customer.shop_id)
    .single();

  if (!shop || shop.owner_id !== user.id) return null;

  return customer;
}

export async function getCustomerActivity(
  customerId: string,
  options?: {
    activityType?: string;
    limit?: number;
    offset?: number;
  }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: customer } = await supabase
    .from("customers")
    .select("shop_id")
    .eq("id", customerId)
    .single();

  if (!customer) return [];

  const { data: shop } = await supabase
    .from("shops")
    .select("owner_id")
    .eq("id", customer.shop_id)
    .single();

  if (!shop || shop.owner_id !== user.id) return [];

  let req = supabase
    .from("customer_activity")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (options?.activityType) {
    req = req.eq("activity_type", options.activityType);
  }

  const limit = options?.limit || 50;
  const offset = options?.offset || 0;
  req = req.range(offset, offset + limit - 1);

  const { data } = await req;
  return data ?? [];
}

export async function addCustomerActivity(
  customerId: string,
  activityType: string,
  description: string,
  metadata?: Record<string, any>
) {
  const supabase = await createServiceClient();
  const { error } = await supabase
    .from("customer_activity")
    .insert({
      customer_id: customerId,
      activity_type: activityType,
      description,
      metadata: metadata ?? null,
    });

  if (error) return { error: error.message };
  return { success: true };
}

export async function updateCustomerInfo(
  customerId: string,
  updates: {
    name?: string;
    phone?: string;
    email?: string;
  }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: customer } = await supabase
    .from("customers")
    .select("shop_id")
    .eq("id", customerId)
    .single();

  if (!customer) return { error: "Customer not found" };

  const { data: shop } = await supabase
    .from("shops")
    .select("owner_id")
    .eq("id", customer.shop_id)
    .single();

  if (!shop || shop.owner_id !== user.id) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("customers")
    .update(updates)
    .eq("id", customerId);

  if (error) return { error: error.message };
  revalidatePath(`/vendor`);
  return { success: true };
}

export async function getHighValueCustomers(shopId: string, threshold = 50000) {
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
    .select("*")
    .eq("shop_id", shopId)
    .gte("total_spent", threshold)
    .order("total_spent", { ascending: false });

  return data ?? [];
}

export async function getCustomerStats(shopId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: shop } = await supabase
    .from("shops")
    .select("owner_id")
    .eq("id", shopId)
    .single();

  if (!shop || shop.owner_id !== user.id) return null;

  const { data: customers } = await supabase
    .from("customers")
    .select("total_orders, total_spent")
    .eq("shop_id", shopId);

  if (!customers) return null;

  const totalCustomers = customers.length;
  const totalRevenue = customers.reduce((sum, c) => sum + c.total_spent, 0);
  const totalOrders = customers.reduce((sum, c) => sum + c.total_orders, 0);
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const averageCustomerValue = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;

  return {
    totalCustomers,
    totalRevenue,
    totalOrders,
    averageOrderValue,
    averageCustomerValue,
  };
}

export async function searchCustomersByEmail(shopId: string, email: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: shop } = await supabase
    .from("shops")
    .select("owner_id")
    .eq("id", shopId)
    .single();

  if (!shop || shop.owner_id !== user.id) return null;

  const { data } = await supabase
    .from("customers")
    .select("*")
    .eq("shop_id", shopId)
    .eq("email", email)
    .single();

  return data ?? null;
}

export async function getOrCreateCustomer(
  shopId: string,
  customerData: {
    email: string;
    name: string;
    phone: string;
  }
) {
  const supabase = await createServiceClient();

  const { data: existing } = await supabase
    .from("customers")
    .select("*")
    .eq("shop_id", shopId)
    .eq("email", customerData.email)
    .single();

  if (existing) {
    return { data: existing, isNew: false };
  }

  const { data: newCustomer, error } = await supabase
    .from("customers")
    .insert({
      shop_id: shopId,
      email: customerData.email,
      name: customerData.name,
      phone: customerData.phone,
      total_orders: 0,
      total_spent: 0,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { data: newCustomer, isNew: true };
}
