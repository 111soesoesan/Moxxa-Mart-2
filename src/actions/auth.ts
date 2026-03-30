"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Allow post-login redirect to same-origin paths only (no open redirects). */
function safeNextPath(raw: FormDataEntryValue | null): string | null {
  if (raw == null || typeof raw !== "string") return null;
  const t = raw.trim();
  if (!t.startsWith("/") || t.startsWith("//")) return null;
  return t;
}

export async function signIn(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const next = safeNextPath(formData.get("next"));

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  redirect(next ?? "/explore");
}

export async function signUp(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const full_name = formData.get("full_name") as string;
  const next = safeNextPath(formData.get("next"));

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name } },
  });
  if (error) return { error: error.message };

  const params = new URLSearchParams({ email });
  if (next) params.set("next", next);
  redirect(`/check-email?${params.toString()}`);
}

export async function resendSignupEmail(formData: FormData) {
  const supabase = await createClient();
  const email = (formData.get("email") as string)?.trim();
  if (!email) return { error: "Email is required" };

  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
  });
  if (error) return { error: error.message };
  return { ok: true as const };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  return data;
}
