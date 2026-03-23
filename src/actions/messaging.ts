"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type MessagingPlatform = "telegram" | "viber" | "webchat";

export type MessagingChannel = {
  id: string;
  shop_id: string;
  platform: MessagingPlatform;
  is_active: boolean;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type MessagingConversation = {
  id: string;
  shop_id: string;
  channel_id: string | null;
  customer_id: string | null;
  platform: MessagingPlatform;
  platform_conversation_id: string | null;
  customer_name: string | null;
  customer_avatar: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  unread_count: number;
  status: "open" | "resolved" | "archived";
  created_at: string;
  updated_at: string;
};

export type MessagingMessage = {
  id: string;
  conversation_id: string;
  direction: "inbound" | "outbound";
  sender_id: string | null;
  sender_name: string | null;
  content: string;
  content_type: "text" | "image" | "file" | "sticker";
  platform_message_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

async function assertShopOwner(shopId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: shop } = await supabase
    .from("shops")
    .select("owner_id")
    .eq("id", shopId)
    .single();

  if (!shop || shop.owner_id !== user.id) throw new Error("Unauthorized");
  return user;
}

export async function getShopChannels(shopId: string): Promise<MessagingChannel[]> {
  await assertShopOwner(shopId);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("messaging_channels")
    .select("*")
    .eq("shop_id", shopId)
    .order("platform");

  if (error) return [];
  return (data ?? []) as MessagingChannel[];
}

export async function upsertChannelSettings(
  shopId: string,
  platform: MessagingPlatform,
  config: Record<string, unknown>,
  isActive: boolean
): Promise<{ error?: string }> {
  await assertShopOwner(shopId);
  const supabase = await createClient();

  const { error } = await supabase
    .from("messaging_channels")
    .upsert(
      { shop_id: shopId, platform, config, is_active: isActive, updated_at: new Date().toISOString() },
      { onConflict: "shop_id,platform" }
    );

  if (error) return { error: error.message };
  revalidatePath(`/vendor/[shopSlug]/messages`, "page");
  return {};
}

export async function getConversations(
  shopId: string,
  options?: {
    platform?: MessagingPlatform;
    status?: "open" | "resolved" | "archived";
    limit?: number;
  }
): Promise<MessagingConversation[]> {
  await assertShopOwner(shopId);
  const supabase = await createClient();

  let query = supabase
    .from("messaging_conversations")
    .select("*")
    .eq("shop_id", shopId)
    .order("last_message_at", { ascending: false, nullsFirst: false });

  if (options?.platform) query = query.eq("platform", options.platform);
  if (options?.status) query = query.eq("status", options.status);
  if (options?.limit) query = query.limit(options.limit);

  const { data, error } = await query;
  if (error) return [];
  return (data ?? []) as MessagingConversation[];
}

export async function getMessages(
  conversationId: string,
  limit = 50
): Promise<MessagingMessage[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: conv } = await supabase
    .from("messaging_conversations")
    .select("shop_id")
    .eq("id", conversationId)
    .single();

  if (!conv) return [];

  const { data: shop } = await supabase
    .from("shops")
    .select("owner_id")
    .eq("id", conv.shop_id)
    .single();

  if (!shop || shop.owner_id !== user.id) return [];

  const { data, error } = await supabase
    .from("messaging_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) return [];
  return (data ?? []) as MessagingMessage[];
}

export async function sendMessage(
  conversationId: string,
  content: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: conv } = await supabase
    .from("messaging_conversations")
    .select("shop_id, platform, platform_conversation_id, channel_id")
    .eq("id", conversationId)
    .single();

  if (!conv) return { error: "Conversation not found" };

  const { data: shop } = await supabase
    .from("shops")
    .select("owner_id")
    .eq("id", conv.shop_id)
    .single();

  if (!shop || shop.owner_id !== user.id) return { error: "Unauthorized" };

  const { error: msgErr } = await supabase.from("messaging_messages").insert({
    conversation_id: conversationId,
    direction: "outbound",
    sender_id: user.id,
    sender_name: "Vendor",
    content,
    content_type: "text",
  });

  if (msgErr) return { error: msgErr.message };

  if (conv.platform === "telegram" && conv.channel_id && conv.platform_conversation_id) {
    const { data: channel } = await supabase
      .from("messaging_channels")
      .select("config")
      .eq("id", conv.channel_id)
      .single();

    const config = channel?.config as Record<string, string> | undefined;
    const botToken = config?.bot_token;
    if (botToken) {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: conv.platform_conversation_id,
          text: content,
        }),
      }).catch(console.error);
    }
  }

  return {};
}

export async function markConversationRead(conversationId: string): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("messaging_conversations")
    .update({ unread_count: 0 })
    .eq("id", conversationId);
}

export async function updateConversationStatus(
  conversationId: string,
  status: "open" | "resolved" | "archived"
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: conv } = await supabase
    .from("messaging_conversations")
    .select("shop_id")
    .eq("id", conversationId)
    .single();

  if (!conv) return { error: "Not found" };

  const { data: shop } = await supabase
    .from("shops")
    .select("owner_id")
    .eq("id", conv.shop_id)
    .single();

  if (!shop || shop.owner_id !== user.id) return { error: "Unauthorized" };

  await supabase
    .from("messaging_conversations")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  return {};
}
