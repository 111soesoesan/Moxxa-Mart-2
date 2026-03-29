"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";

const updateSchema = z.object({
  full_name: z.string().trim().min(1, "Name is required").max(200),
  phone: z.string().trim().max(40).optional().nullable(),
  default_address: z.string().trim().max(2000).optional().nullable(),
  avatar_url: z.union([z.string().url(), z.literal(""), z.null()]),
});

export type UpdateMyProfileInput = z.infer<typeof updateSchema>;

export async function getMyProfilePageData() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: true as const, data: null };

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("full_name, phone, default_address, avatar_url")
    .eq("id", user.id)
    .single();

  if (error) return { success: false as const, error: error.message };
  return {
    success: true as const,
    data: { ...profile, email: user.email ?? "" },
  };
}

export async function getMyProfileForCheckout() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: true as const, data: null };

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("full_name, phone, default_address, avatar_url")
    .eq("id", user.id)
    .single();

  if (error) return { success: false as const, error: error.message };
  return {
    success: true as const,
    data: {
      ...profile,
      email: user.email ?? "",
    },
  };
}

export async function updateMyProfile(raw: UpdateMyProfileInput) {
  const parsed = updateSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false as const, error: "Not signed in" };

  const { full_name, phone, default_address, avatar_url } = parsed.data;
  const avatar =
    avatar_url === "" || avatar_url === null ? null : avatar_url;

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name,
      phone: phone?.trim() || null,
      default_address: default_address?.trim() || null,
      avatar_url: avatar,
    })
    .eq("id", user.id);

  if (error) return { success: false as const, error: error.message };

  const svc = await createServiceClient();
  await svc
    .from("customers")
    .update({
      name: full_name,
      phone: phone?.trim() || null,
    })
    .eq("user_id", user.id);

  revalidatePath("/", "layout");
  revalidatePath("/profile");
  revalidatePath("/checkout");
  return { success: true as const };
}
