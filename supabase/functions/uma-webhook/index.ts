import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-telegram-bot-api-secret-token, x-viber-content-signature",
};

const OK = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

interface NormalizedMessage {
  platform: "telegram" | "viber" | "webchat";
  platform_conversation_id: string;
  platform_message_id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar?: string;
  content: string;
  content_type: "text" | "image" | "file" | "sticker";
  metadata?: Record<string, unknown>;
}

async function hmacSha256Hex(key: string, data: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBytes = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data));
  return Array.from(new Uint8Array(sigBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function normalizeTelegram(body: Record<string, unknown>): NormalizedMessage | null {
  const message = (body.message ?? body.edited_message ?? body.channel_post) as
    | Record<string, unknown>
    | undefined;
  if (!message) return null;

  const from = message.from as Record<string, unknown> | undefined;
  const chat = message.chat as Record<string, unknown> | undefined;
  if (!chat) return null;

  const chatId = String(chat.id);
  const msgId = String(message.message_id ?? "");
  const firstName = String(from?.first_name ?? "");
  const lastName = String(from?.last_name ?? "");
  const senderName =
    [firstName, lastName].filter(Boolean).join(" ") ||
    String(from?.username ?? "Unknown");
  const senderId = String(from?.id ?? chat.id);

  let content = "";
  let contentType: NormalizedMessage["content_type"] = "text";

  if (message.text) {
    content = String(message.text);
    contentType = "text";
  } else if (message.photo) {
    content = String((message.caption as string) ?? "[Photo]");
    contentType = "image";
  } else if (message.sticker) {
    content = "[Sticker]";
    contentType = "sticker";
  } else if (message.document) {
    content = String((message.caption as string) ?? "[File]");
    contentType = "file";
  } else {
    content = "[Unsupported message type]";
  }

  return {
    platform: "telegram",
    platform_conversation_id: chatId,
    platform_message_id: msgId,
    sender_id: senderId,
    sender_name: senderName,
    sender_avatar: from?.username
      ? `https://t.me/i/userpic/320/${from.username}.jpg`
      : undefined,
    content,
    content_type: contentType,
    metadata: { raw: body },
  };
}

function normalizeViber(body: Record<string, unknown>): NormalizedMessage | null {
  if (body.event !== "message") return null;

  const sender = body.sender as Record<string, unknown> | undefined;
  const message = body.message as Record<string, unknown> | undefined;
  if (!sender || !message) return null;

  const senderId = String(sender.id ?? "");
  const senderName = String(sender.name ?? "Unknown");
  const avatar = sender.avatar ? String(sender.avatar) : undefined;
  const msgId = String(body.message_token ?? "");

  let content = "";
  let contentType: NormalizedMessage["content_type"] = "text";

  const msgType = String(message.type ?? "text");
  if (msgType === "text") {
    content = String(message.text ?? "");
    contentType = "text";
  } else if (msgType === "picture") {
    content = String(message.text ?? "[Photo]");
    contentType = "image";
  } else if (msgType === "file") {
    content = String(message.file_name ?? "[File]");
    contentType = "file";
  } else if (msgType === "sticker") {
    content = "[Sticker]";
    contentType = "sticker";
  } else {
    content = "[Unsupported message type]";
  }

  return {
    platform: "viber",
    platform_conversation_id: senderId,
    platform_message_id: msgId,
    sender_id: senderId,
    sender_name: senderName,
    sender_avatar: avatar,
    content,
    content_type: contentType,
    metadata: { raw: body },
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const rawBody = await req.text();

  try {
    const url = new URL(req.url);
    const platform = url.searchParams.get("platform") as
      | "telegram"
      | "viber"
      | "webchat"
      | null;
    const channelId = url.searchParams.get("channel_id");

    if (!platform || !channelId) {
      return OK({ ok: true, skipped: true, reason: "missing params" });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: channel, error: chanErr } = await supabase
      .from("messaging_channels")
      .select("id, shop_id, is_active, config, platform")
      .eq("id", channelId)
      .single();

    if (chanErr || !channel || !channel.is_active) {
      return OK({ ok: true, skipped: true, reason: "channel inactive or not found" });
    }

    const config = channel.config as Record<string, string>;

    if (platform === "telegram") {
      const incomingSecret = req.headers.get("x-telegram-bot-api-secret-token");
      const storedSecret = config.webhook_secret;
      if (storedSecret && incomingSecret !== storedSecret) {
        console.warn("Telegram secret token mismatch — request ignored");
        return OK({ ok: true, skipped: true, reason: "invalid secret" });
      }
    }

    if (platform === "viber") {
      const signature = req.headers.get("x-viber-content-signature");
      const authToken = config.auth_token;
      if (authToken && signature) {
        const expected = await hmacSha256Hex(authToken, rawBody);
        if (expected !== signature) {
          console.warn("Viber signature mismatch — request ignored");
          return OK({ ok: true, skipped: true, reason: "invalid signature" });
        }
      }
    }

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      return OK({ ok: true, skipped: true, reason: "invalid JSON" });
    }

    let normalized: NormalizedMessage | null = null;
    if (platform === "telegram") {
      normalized = normalizeTelegram(body);
    } else if (platform === "viber") {
      normalized = normalizeViber(body);
    } else if (platform === "webchat") {
      normalized = {
        platform: "webchat",
        platform_conversation_id: String(
          body.session_id ?? body.conversation_id ?? ""
        ),
        platform_message_id: String(body.message_id ?? crypto.randomUUID()),
        sender_id: String(body.sender_id ?? "guest"),
        sender_name: String(body.sender_name ?? "Guest"),
        content: String(body.content ?? ""),
        content_type: "text",
        metadata: { raw: body },
      };
    }

    if (!normalized || !normalized.content) {
      return OK({ ok: true, skipped: true, reason: "no content to store" });
    }

    const { data: existingConv } = await supabase
      .from("messaging_conversations")
      .select("id")
      .eq("channel_id", channelId)
      .eq("platform_conversation_id", normalized.platform_conversation_id)
      .maybeSingle();

    let conversationId: string;

    if (existingConv) {
      conversationId = existingConv.id;
    } else {
      const { data: existingIdentity } = await supabase
        .from("customer_identities")
        .select("customer_id")
        .eq("platform", platform)
        .eq("platform_id", normalized.sender_id)
        .maybeSingle();

      let customerId: string | null = existingIdentity?.customer_id ?? null;

      if (!customerId) {
        const { data: newCustomer } = await supabase
          .from("customers")
          .insert({
            shop_id: channel.shop_id,
            name: normalized.sender_name,
            preferred_channel: platform,
          })
          .select("id")
          .single();

        if (newCustomer) {
          customerId = newCustomer.id;
          await supabase.from("customer_identities").insert({
            customer_id: customerId,
            platform,
            platform_id: normalized.sender_id,
            metadata: { avatar: normalized.sender_avatar },
          });
        }
      }

      const { data: newConv, error: convErr } = await supabase
        .from("messaging_conversations")
        .insert({
          shop_id: channel.shop_id,
          channel_id: channelId,
          customer_id: customerId,
          platform: normalized.platform,
          platform_conversation_id: normalized.platform_conversation_id,
          customer_name: normalized.sender_name,
          customer_avatar: normalized.sender_avatar ?? null,
          status: "open",
        })
        .select("id")
        .single();

      if (convErr || !newConv) {
        console.error("Failed to create conversation", convErr);
        return OK({ ok: true, skipped: true, reason: "conversation insert failed" });
      }

      conversationId = newConv.id;
    }

    const { error: msgErr } = await supabase.from("messaging_messages").insert({
      conversation_id: conversationId,
      direction: "inbound",
      sender_id: normalized.sender_id,
      sender_name: normalized.sender_name,
      content: normalized.content,
      content_type: normalized.content_type,
      platform_message_id: normalized.platform_message_id,
      metadata: normalized.metadata ?? null,
    });

    if (msgErr) {
      console.error("Failed to insert message", msgErr);
      return OK({ ok: true, skipped: true, reason: "message insert failed" });
    }

    return OK({ ok: true, conversation_id: conversationId });
  } catch (err) {
    console.error("UMA webhook error", err);
    return OK({ ok: true, skipped: true, reason: "internal error" });
  }
});
