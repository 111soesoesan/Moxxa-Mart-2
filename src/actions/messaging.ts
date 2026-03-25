"use server";

import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/supabase";
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
  ai_active: boolean;
  channel: { id: string; ai_enabled: boolean } | null;
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

function buildWebhookUrl(platform: MessagingPlatform, channelId: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return `${base}/functions/v1/uma-webhook?platform=${platform}&channel_id=${channelId}`;
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
): Promise<{ error?: string; webhookStatus?: string }> {
  await assertShopOwner(shopId);
  const supabase = await createClient();

  const existingSecret = (config.webhook_secret as string | undefined);
  const webhookSecret =
    platform === "telegram"
      ? (existingSecret ?? crypto.randomUUID().replace(/-/g, ""))
      : undefined;

  const finalConfig = webhookSecret
    ? { ...config, webhook_secret: webhookSecret }
    : config;

  const { data: channel, error } = await supabase
    .from("messaging_channels")
    .upsert(
      {
        shop_id: shopId,
        platform,
        // Cast to Supabase Json type to satisfy generated typings
        config: finalConfig as Json,
        is_active: isActive,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "shop_id,platform" }
    )
    .select("id")
    .single();

  if (error || !channel) return { error: error?.message ?? "Failed to save settings" };

  const channelId = channel.id;
  const webhookUrl = buildWebhookUrl(platform, channelId);
  let webhookStatus: string | undefined;

  if (platform === "telegram" && config.bot_token && isActive) {
    try {
      const params = new URLSearchParams({ url: webhookUrl });
      if (webhookSecret) params.set("secret_token", webhookSecret);
      const res = await fetch(
        `https://api.telegram.org/bot${config.bot_token}/setWebhook?${params}`,
        { method: "GET" }
      );
      const result = await res.json() as { ok: boolean; description?: string };
      webhookStatus = result.ok
        ? "Webhook registered automatically"
        : (result.description ?? "Registration failed");
    } catch {
      webhookStatus = "Could not reach Telegram API";
    }
  } else if (platform === "telegram" && !isActive && config.bot_token) {
    try {
      await fetch(
        `https://api.telegram.org/bot${config.bot_token}/deleteWebhook`,
        { method: "GET" }
      );
    } catch { /* ignore */ }
  }

  if (platform === "viber" && config.auth_token && isActive) {
    try {
      const res = await fetch("https://chatapi.viber.com/pa/set_webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Viber-Auth-Token": config.auth_token as string,
        },
        body: JSON.stringify({
          url: webhookUrl,
          event_types: ["message", "delivered", "failed", "conversation_started"],
          send_name: true,
          send_photo: true,
        }),
      });
      const result = await res.json() as { status: number; status_message: string };
      webhookStatus =
        result.status === 0
          ? "Webhook registered automatically"
          : (result.status_message ?? "Registration failed");
    } catch {
      webhookStatus = "Could not reach Viber API";
    }
  } else if (platform === "viber" && !isActive && config.auth_token) {
    try {
      await fetch("https://chatapi.viber.com/pa/set_webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Viber-Auth-Token": config.auth_token as string,
        },
        body: JSON.stringify({ url: "" }),
      });
    } catch { /* ignore */ }
  }

  revalidatePath(`/vendor/[shopSlug]/messages`, "page");
  return { webhookStatus };
}

export async function testChannelConnection(
  shopId: string,
  platform: MessagingPlatform
): Promise<{ ok: boolean; info?: string; error?: string }> {
  await assertShopOwner(shopId);
  const supabase = await createClient();

  const { data: channel } = await supabase
    .from("messaging_channels")
    .select("config, is_active")
    .eq("shop_id", shopId)
    .eq("platform", platform)
    .single();

  if (!channel) return { ok: false, error: "Channel not configured yet" };

  const config = channel.config as Record<string, string>;

  if (platform === "telegram") {
    const token = config.bot_token;
    if (!token) return { ok: false, error: "No bot token saved" };
    try {
      const [meRes, webhookRes] = await Promise.all([
        fetch(`https://api.telegram.org/bot${token}/getMe`).then((r) => r.json()) as Promise<{ ok: boolean; result?: { username?: string } }>,
        fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`).then((r) => r.json()) as Promise<{ ok: boolean; result?: { url?: string } }>,
      ]);
      if (!meRes.ok) return { ok: false, error: "Invalid bot token" };
      const webhookSet = !!webhookRes.result?.url;
      return {
        ok: true,
        info: `Connected as @${meRes.result?.username ?? "unknown"}. Webhook: ${webhookSet ? "registered" : "not set"}`,
      };
    } catch {
      return { ok: false, error: "Could not reach Telegram API" };
    }
  }

  if (platform === "viber") {
    const token = config.auth_token;
    if (!token) return { ok: false, error: "No auth token saved" };
    try {
      const res = await fetch("https://chatapi.viber.com/pa/get_account_info", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Viber-Auth-Token": token,
        },
        body: "{}",
      });
      const result = await res.json() as { status: number; status_message: string; name?: string };
      if (result.status !== 0) return { ok: false, error: result.status_message };
      return { ok: true, info: `Connected as "${result.name ?? "Unknown"}"` };
    } catch {
      return { ok: false, error: "Could not reach Viber API" };
    }
  }

  if (platform === "webchat") {
    return {
      ok: channel.is_active,
      info: channel.is_active
        ? "Web chat is active and visible on your storefront"
        : "Web chat is currently disabled",
    };
  }

  return { ok: false, error: "Unknown platform" };
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
    .select("*, channel:channel_id(id, ai_enabled)")
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
  payload: { content: string; contentType: MessagingMessage["content_type"]; caption?: string }
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

  const metadata =
    payload.caption && payload.caption.trim()
      ? { caption: payload.caption.trim().slice(0, 512) }
      : null;

  const { error: msgErr } = await supabase.from("messaging_messages").insert({
    conversation_id: conversationId,
    direction: "outbound",
    sender_id: user.id,
    sender_name: "Vendor",
    content: payload.content,
    content_type: payload.contentType,
    metadata: metadata as Json | null,
  });

  if (msgErr) return { error: msgErr.message };

  if (conv.channel_id && conv.platform_conversation_id) {
    const { data: channel } = await supabase
      .from("messaging_channels")
      .select("config")
      .eq("id", conv.channel_id)
      .single();

    const config = channel?.config as Record<string, string> | undefined;

    if (conv.platform === "telegram" && config?.bot_token) {
      if (payload.contentType === "image") {
        await fetch(`https://api.telegram.org/bot${config.bot_token}/sendPhoto`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: conv.platform_conversation_id,
            photo: payload.content,
            caption: payload.caption ?? "",
          }),
        }).catch(console.error);
      } else {
        await fetch(`https://api.telegram.org/bot${config.bot_token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: conv.platform_conversation_id,
            text: payload.content,
          }),
        }).catch(console.error);
      }
    }

    if (conv.platform === "viber" && config?.auth_token) {
      if (payload.contentType === "image") {
        await fetch("https://chatapi.viber.com/pa/send_message", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Viber-Auth-Token": config.auth_token,
          },
          body: JSON.stringify({
            receiver: conv.platform_conversation_id,
            min_api_version: 1,
            sender: { name: "Vendor" },
            tracking_data: conversationId,
            type: "picture",
            text: payload.caption ?? "",
            media: payload.content,
          }),
        }).catch(console.error);
      } else {
        await fetch("https://chatapi.viber.com/pa/send_message", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Viber-Auth-Token": config.auth_token,
          },
          body: JSON.stringify({
            receiver: conv.platform_conversation_id,
            min_api_version: 1,
            sender: { name: "Vendor" },
            tracking_data: conversationId,
            type: "text",
            text: payload.content,
          }),
        }).catch(console.error);
      }
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

export async function setConversationAIActive(
  conversationId: string,
  aiActive: boolean
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

  await (supabase as any)
    .from("messaging_conversations")
    .update({ ai_active: aiActive, updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  return {};
}
