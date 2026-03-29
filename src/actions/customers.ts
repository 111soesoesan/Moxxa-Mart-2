"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";

/** Joined from `profiles` when the customer is linked to an account (`user_id`). */
export type CustomerProfileEmbed = {
  full_name: string | null;
  avatar_url: string | null;
} | null;

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
  preferred_channel: string;
  created_at: string;
  updated_at: string;
  profiles?: CustomerProfileEmbed;
};

export type CustomerIdentity = {
  id: string;
  customer_id: string;
  platform: string;
  platform_id: string;
  metadata: Record<string, any> | null;
  created_at: string;
};

export type CustomerActivity = {
  id: string;
  customer_id: string;
  activity_type: string;
  reference_id: string | null;
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
    .select("*, profiles(full_name, avatar_url)")
    .eq("shop_id", shopId);

  if (options?.search) {
    req = req.or(
      `email.ilike.%${options.search}%,name.ilike.%${options.search}%,phone.ilike.%${options.search}%`
    );
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
    .select("*, profiles(full_name, avatar_url)")
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

export async function getCustomerOrders(customerId: string) {
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

  const { data } = await supabase
    .from("orders")
    .select("id, status, payment_status, total, created_at, items_snapshot, customer_snapshot")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(50);

  return data ?? [];
}

export async function getCustomerIdentities(customerId: string) {
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

  const { data } = await supabase
    .from("customer_identities")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: true });

  return (data ?? []) as CustomerIdentity[];
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
    .select("*, profiles(full_name, avatar_url)")
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
    .select("*, profiles(full_name, avatar_url)")
    .eq("shop_id", shopId)
    .eq("email", email)
    .maybeSingle();

  return data ?? null;
}

/**
 * Unified identity resolution: finds or creates a customer record for a shop.
 *
 * Resolution order:
 * 1. Platform identity match (customer_identities table) — most specific.
 * 2. Phone match — works for guests who never provide email.
 * 3. Email match — for web / authenticated users.
 * 4. Create new record when no match is found.
 *
 * After finding a match, any missing fields (email, phone) are backfilled,
 * and the platform identity is registered if not already present.
 */
export async function getOrCreateCustomer(
  shopId: string,
  customerData: {
    email?: string;
    name: string;
    phone?: string;
    platform?: string;
    platformId?: string;
    /** Links the shop customer row to `profiles` for avatar/name sync in vendor CRM. */
    userId?: string | null;
  }
) {
  const supabase = await createServiceClient();

  // ── 1. Look up by platform identity ──────────────────────────
  if (customerData.platform && customerData.platformId) {
    const { data: identityRows } = await supabase
      .from("customer_identities")
      .select("customer_id")
      .eq("platform", customerData.platform)
      .eq("platform_id", customerData.platformId);

    if (identityRows && identityRows.length > 0) {
      const custId = identityRows[0].customer_id;
      const { data: existing } = await supabase
        .from("customers")
        .select("*")
        .eq("id", custId)
        .eq("shop_id", shopId)
        .maybeSingle();

      if (existing) {
        await backfillCustomerFields(supabase, existing, customerData);
        return { data: existing, isNew: false };
      }
    }
  }

  // ── 2. Look up by phone ───────────────────────────────────────
  if (customerData.phone) {
    const { data: byPhone } = await supabase
      .from("customers")
      .select("*")
      .eq("shop_id", shopId)
      .eq("phone", customerData.phone)
      .maybeSingle();

    if (byPhone) {
      await backfillCustomerFields(supabase, byPhone, customerData);
      await registerIdentity(supabase, byPhone.id, customerData);
      return { data: byPhone, isNew: false };
    }
  }

  // ── 3. Look up by email ───────────────────────────────────────
  if (customerData.email) {
    const { data: byEmail } = await supabase
      .from("customers")
      .select("*")
      .eq("shop_id", shopId)
      .eq("email", customerData.email)
      .maybeSingle();

    if (byEmail) {
      await backfillCustomerFields(supabase, byEmail, customerData);
      await registerIdentity(supabase, byEmail.id, customerData);
      return { data: byEmail, isNew: false };
    }
  }

  // ── 4. Create new customer ────────────────────────────────────
  const { data: newCustomer, error } = await supabase
    .from("customers")
    .insert({
      shop_id: shopId,
      email: customerData.email || null,
      name: customerData.name,
      phone: customerData.phone || null,
      preferred_channel: customerData.platform || "web",
      total_orders: 0,
      total_spent: 0,
      user_id: customerData.userId ?? null,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  await registerIdentity(supabase, newCustomer.id, customerData);

  return { data: newCustomer, isNew: true };
}

/** Backfills missing email, phone, or account link on an existing customer record. */
async function backfillCustomerFields(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  customer: { id: string; email: string | null; phone: string | null; user_id: string | null },
  newData: { email?: string; phone?: string; name?: string; userId?: string | null }
) {
  const updates: {
    email?: string;
    phone?: string;
    user_id?: string;
  } = {};
  if (newData.email && !customer.email) updates.email = newData.email;
  if (newData.phone && !customer.phone) updates.phone = newData.phone;
  if (newData.userId && !customer.user_id) updates.user_id = newData.userId;
  if (Object.keys(updates).length === 0) return;
  await supabase.from("customers").update(updates).eq("id", customer.id);
}

/** Upserts a platform identity link if platform + platformId are provided. */
async function registerIdentity(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  customerId: string,
  data: { platform?: string; platformId?: string; name?: string }
) {
  if (!data.platform || !data.platformId) return;
  await supabase
    .from("customer_identities")
    .upsert(
      {
        customer_id: customerId,
        platform: data.platform,
        platform_id: data.platformId,
        metadata: data.name ? { display_name: data.name } : null,
      },
      { onConflict: "customer_id,platform" }
    );
}
