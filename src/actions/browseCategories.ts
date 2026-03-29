"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";
import type { TablesInsert, TablesUpdate } from "@/types/supabase";

async function assertAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" as const, supabase: null as null };
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return { error: "Forbidden" as const, supabase: null as null };
  return { error: null as null, supabase };
}

export async function getActiveBrowseCategories() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("browse_categories")
    .select("id, slug, name, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  return data ?? [];
}

export async function getBrowseCategoryIdBySlug(slug: string) {
  if (!slug) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("browse_categories")
    .select("id, name")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  return data;
}

export async function getAllBrowseCategoriesAdmin() {
  const { error, supabase } = await assertAdmin();
  if (error || !supabase) return { error, data: null as null };
  const { data, error: qErr } = await supabase
    .from("browse_categories")
    .select("*")
    .order("sort_order", { ascending: true });
  if (qErr) return { error: qErr.message, data: null };
  return { data: data ?? [], error: null };
}

export async function createBrowseCategory(payload: {
  name: string;
  slug?: string;
  description?: string | null;
  sort_order?: number;
  is_active?: boolean;
}) {
  const { error, supabase } = await assertAdmin();
  if (error || !supabase) return { error, data: null as null };
  const slug = (payload.slug?.trim() || slugify(payload.name)).toLowerCase();
  if (!slug) return { error: "Slug is required", data: null };
  const row: TablesInsert<"browse_categories"> = {
    name: payload.name.trim(),
    slug,
    description: payload.description?.trim() || null,
    sort_order: payload.sort_order ?? 0,
    is_active: payload.is_active ?? true,
  };
  const { data, error: insErr } = await supabase.from("browse_categories").insert(row).select().single();
  if (insErr) return { error: insErr.message, data: null };
  revalidatePath("/admin/browse-categories");
  revalidatePath("/");
  revalidatePath("/search");
  revalidatePath("/shops");
  return { data, error: null };
}

export async function updateBrowseCategory(
  id: string,
  payload: TablesUpdate<"browse_categories">
) {
  const { error, supabase } = await assertAdmin();
  if (error || !supabase) return { error, data: null as null };
  const { data, error: upErr } = await supabase
    .from("browse_categories")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (upErr) return { error: upErr.message, data: null };
  revalidatePath("/admin/browse-categories");
  revalidatePath("/");
  revalidatePath("/search");
  revalidatePath("/shops");
  return { data, error: null };
}

export async function deleteBrowseCategory(id: string) {
  const { error, supabase } = await assertAdmin();
  if (error || !supabase) return { error };
  const { error: delErr } = await supabase.from("browse_categories").delete().eq("id", id);
  if (delErr) return { error: delErr.message };
  revalidatePath("/admin/browse-categories");
  revalidatePath("/");
  revalidatePath("/search");
  revalidatePath("/shops");
  return { success: true as const };
}
