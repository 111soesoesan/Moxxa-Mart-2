"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export type AIPersona = {
  id: string;
  shop_id: string;
  name: string;
  description_template: "professional" | "friendly" | "streetwear" | "tech" | "luxury";
  system_prompt: string;
  greeting_message: string;
  temperature: number;
  top_p: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type UpsertPersonaInput = {
  name: string;
  description_template: "professional" | "friendly" | "streetwear" | "tech" | "luxury";
  system_prompt: string;
  greeting_message: string;
  temperature: number;
  top_p: number;
  is_active: boolean;
};

// ─── Get or create persona for a shop ────────────────────────────────────────

export async function getAIPersona(shopId: string): Promise<AIPersona | null> {
  const supabase = (await createClient()) as any;
  const { data } = await supabase
    .from("ai_personas")
    .select("*")
    .eq("shop_id", shopId)
    .single();
  return (data as AIPersona) ?? null;
}

// ─── Upsert persona (create or update) ───────────────────────────────────────

export async function upsertAIPersona(
  shopId: string,
  input: UpsertPersonaInput
): Promise<{ success: boolean; error?: string; data?: AIPersona }> {
  const supabaseTyped = await createClient();
  const { data: { user } } = await supabaseTyped.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { data: shop } = await supabaseTyped
    .from("shops")
    .select("owner_id, slug")
    .eq("id", shopId)
    .single();
  if (!shop || shop.owner_id !== user.id) return { success: false, error: "Unauthorized" };

  const supabase = supabaseTyped as any;
  const payload = {
    shop_id: shopId,
    name: input.name.trim() || "Aria",
    description_template: input.description_template,
    system_prompt: input.system_prompt.trim(),
    greeting_message: input.greeting_message.trim() || "Hi! How can I help you today?",
    temperature: Math.min(2, Math.max(0, input.temperature)),
    top_p: Math.min(1, Math.max(0, input.top_p)),
    is_active: input.is_active,
  };

  const { data, error } = await supabase
    .from("ai_personas")
    .upsert(payload, { onConflict: "shop_id" })
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath(`/vendor/${shop.slug}/ai-assistant`);
  return { success: true, data: data as AIPersona };
}

// ─── Toggle active state quickly ─────────────────────────────────────────────

export async function toggleAIPersonaActive(
  shopId: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  const supabaseTyped = await createClient();
  const { data: { user } } = await supabaseTyped.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { data: shop } = await supabaseTyped
    .from("shops")
    .select("owner_id, slug")
    .eq("id", shopId)
    .single();
  if (!shop || shop.owner_id !== user.id) return { success: false, error: "Unauthorized" };

  const supabase = supabaseTyped as any;
  const { error } = await supabase
    .from("ai_personas")
    .update({ is_active: isActive })
    .eq("shop_id", shopId);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/vendor/${shop.slug}/ai-assistant`);
  return { success: true };
}

// ─── Get conversation stats for a shop (usage tracking) ──────────────────────

export async function getAIConversationStats(shopId: string): Promise<{
  total_sessions: number;
  total_messages: number;
  tokens_input: number;
  tokens_output: number;
}> {
  const supabaseTyped = await createClient();
  const { data: { user } } = await supabaseTyped.auth.getUser();
  if (!user) return { total_sessions: 0, total_messages: 0, tokens_input: 0, tokens_output: 0 };

  const supabase = supabaseTyped as any;
  const { data } = await supabase
    .from("ai_conversation_logs")
    .select("messages_count, tokens_input, tokens_output")
    .eq("shop_id", shopId);

  if (!data || data.length === 0) {
    return { total_sessions: 0, total_messages: 0, tokens_input: 0, tokens_output: 0 };
  }

  return {
    total_sessions: data.length,
    total_messages: data.reduce((s: number, r: any) => s + (r.messages_count ?? 0), 0),
    tokens_input: data.reduce((s: number, r: any) => s + (r.tokens_input ?? 0), 0),
    tokens_output: data.reduce((s: number, r: any) => s + (r.tokens_output ?? 0), 0),
  };
}

// ─── Public: fetch active persona by shop slug (for API route) ───────────────

export async function getActivePersonaBySlug(shopSlug: string): Promise<{
  persona: AIPersona | null;
  shopId: string | null;
  shopName: string | null;
}> {
  const supabaseTyped = await createServiceClient();

  const { data: shop } = await supabaseTyped
    .from("shops")
    .select("id, name")
    .eq("slug", shopSlug)
    .single();

  if (!shop) return { persona: null, shopId: null, shopName: null };

  const supabase = supabaseTyped as any;
  const { data: persona } = await supabase
    .from("ai_personas")
    .select("*")
    .eq("shop_id", shop.id)
    .eq("is_active", true)
    .single();

  return {
    persona: (persona as AIPersona) ?? null,
    shopId: shop.id,
    shopName: shop.name,
  };
}
