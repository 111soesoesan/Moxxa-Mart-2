import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { generateText, stepCountIs, tool } from "npm:ai";
import { createGoogleGenerativeAI } from "npm:@ai-sdk/google";
import { z } from "npm:zod";

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

async function normalizeTelegram(
  body: Record<string, unknown>,
  botToken: string | null
): Promise<NormalizedMessage | null> {
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
  let caption = "";

  if (message.text) {
    content = String(message.text);
    contentType = "text";
  } else if (message.photo) {
    contentType = "image";
    caption = String((message.caption as string) ?? "");
    if (botToken) {
      const photos = message.photo as Array<Record<string, unknown>> | undefined;
      const best = photos?.[photos.length - 1];
      const fileId = best ? String(best.file_id ?? "") : "";
      if (fileId) {
        try {
          const fileRes = await fetch(
            `https://api.telegram.org/bot${botToken}/getFile?file_id=${encodeURIComponent(fileId)}`
          );
          const fileJson = (await fileRes.json()) as {
            result?: { file_path?: string };
          } | null;
          const filePath = fileJson?.result?.file_path;
          if (filePath) content = `https://api.telegram.org/file/bot${botToken}/${filePath}`;
        } catch {
          // fall back to placeholder below
        }
      }
    }
    if (!content) content = "[Photo]";
  } else if (message.sticker) {
    content = "[Sticker]";
    contentType = "sticker";
  } else if (message.document) {
    const doc = message.document as Record<string, unknown>;
    const mimeType = String(doc?.mime_type ?? "");
    caption = String((message.caption as string) ?? "");
    if (mimeType.startsWith("image/") && botToken) {
      contentType = "image";
      const fileId = String(doc?.file_id ?? "");
      if (fileId) {
        try {
          const fileRes = await fetch(
            `https://api.telegram.org/bot${botToken}/getFile?file_id=${encodeURIComponent(fileId)}`
          );
          const fileJson = (await fileRes.json()) as {
            result?: { file_path?: string };
          } | null;
          const filePath = fileJson?.result?.file_path;
          if (filePath) content = `https://api.telegram.org/file/bot${botToken}/${filePath}`;
        } catch {
          // fall back to placeholder below
        }
      }
      if (!content) content = "[Photo]";
    } else {
      content = String((message.caption as string) ?? "[File]");
      contentType = "file";
    }
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
    metadata: {
      raw: body,
      ...(caption ? { caption } : {}),
    },
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
  let caption = "";

  const msgType = String(message.type ?? "text");
  if (msgType === "text") {
    content = String(message.text ?? "");
    contentType = "text";
  } else if (msgType === "picture") {
    contentType = "image";
    caption = String(message.text ?? "");
    const media =
      (message as Record<string, unknown>).media ??
      (message as Record<string, unknown>).media_url;
    content = media ? String(media) : "[Photo]";
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
    metadata: {
      raw: body,
      ...(caption ? { caption } : {}),
    },
  };
}

const TEMPLATE_PERSONAS: Record<string, string> = {
  professional:
    "You are a professional, knowledgeable shopping assistant. You communicate clearly, " +
    "concisely, and helpfully. You focus on accuracy and efficiency.",
  friendly:
    "You are a warm, friendly shopping assistant. You're enthusiastic and conversational, " +
    "like helping a friend shop. Use casual language and be encouraging.",
  streetwear:
    "You are a streetwear-savvy assistant who knows all the latest drops, brands, and culture. " +
    "Use relevant slang naturally, talk about fits, hype, and exclusivity.",
  tech:
    "You are a tech-enthusiast assistant. You love specs, features, and helping customers " +
    "understand the technical benefits of products. Be precise and informative.",
  luxury:
    "You are an elegant, refined assistant specializing in luxury goods. Speak with sophistication " +
    "and exclusivity. Emphasize quality, craftsmanship, and prestige.",
};

function buildSystemPrompt(shopName: string, template: string, customInstructions: string): string {
  const persona = TEMPLATE_PERSONAS[template] ?? TEMPLATE_PERSONAS.professional;

  return `${persona}

You are the AI assistant for **${shopName}**, a shop on Moxxa Mart.

CORE RULES:
- Only recommend products from this shop's catalog. Never suggest products from other stores.
- Currency is Philippine Peso (₱). Always display prices in this format.
- Be concise. Avoid long paragraphs; use bullet points for product details when helpful.
- If a customer asks to order, use the take_order tool to collect their info step by step.
- If you don't know something about a product, use the search_products or get_product_details tool.
- Never make up prices, stock levels, or product attributes; always check the tools.
- If asked something unrelated to shopping or this store, politely redirect.

${customInstructions ? `ADDITIONAL INSTRUCTIONS FROM ${shopName.toUpperCase()}:\n${customInstructions}` : ""}`.trim();
}

function createGeminiModel() {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  const google = createGoogleGenerativeAI({ apiKey });
  return google("gemini-2.5-flash");
}

function buildAITools(
  // deno-lint-ignore no-explicit-any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  shop: { id: string; name: string }
) {
  // deno-lint-ignore no-explicit-any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const makeTool = (def: any) => tool(def);

  return {
    search_products: makeTool({
      description:
        "Search the shop's product catalog by keyword, category, or description. " +
        "Use this when a customer asks what products are available or describes what they want.",
      inputSchema: z.object({
        query: z.string().describe("Search query (product name, category, or description)"),
        limit: z.number().optional().default(6).describe("Max results to return"),
      }),
      execute: async ({ query, limit }: { query: string; limit: number }) => {
        const { data: products } = await supabase
          .from("products")
          .select("id, name, price, sale_price, description, stock, product_type, main_image, sku")
          .eq("shop_id", shop.id)
          .eq("is_active", true)
          .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
          .order("name")
          .limit(limit);

        if (!products || products.length === 0) {
          return { found: false, message: "No products found matching that search." };
        }

        return {
          found: true,
          products: products.map((product: Record<string, unknown>) => ({
            id: String(product.id),
            name: String(product.name),
            price: Number(product.price ?? 0),
            sale_price: product.sale_price == null ? null : Number(product.sale_price),
            effective_price:
              product.sale_price == null
                ? Number(product.price ?? 0)
                : Number(product.sale_price),
            description:
              typeof product.description === "string"
                ? product.description.slice(0, 200)
                : null,
            in_stock: Number(product.stock ?? 0) > 0,
            main_image:
              typeof product.main_image === "string" ? product.main_image : null,
            product_type: String(product.product_type ?? "simple"),
            sku: typeof product.sku === "string" ? product.sku : null,
          })),
        };
      },
    }),

    get_product_details: makeTool({
      description:
        "Get full details for a specific product including all variations, sizes, colors, " +
        "and stock levels. Use this when a customer wants to know more about a specific item.",
      inputSchema: z.object({
        product_id: z.string().describe("The product ID to look up"),
      }),
      execute: async ({ product_id }: { product_id: string }) => {
        const { data: product } = await supabase
          .from("products")
          .select(
            `id, name, price, sale_price, description, stock, product_type,
             main_image, sku, track_inventory,
             product_variations(id, attribute_combination, price, sale_price, stock_quantity, is_active, image_url),
             product_categories(category_id, categories(name))`
          )
          .eq("id", product_id)
          .eq("shop_id", shop.id)
          .maybeSingle();

        if (!product) return { found: false };

        const variations = ((product.product_variations as Array<Record<string, unknown>> | null) ?? [])
          .filter((variation) => Boolean(variation.is_active))
          .map((variation) => ({
            id: String(variation.id),
            attributes: variation.attribute_combination,
            price: Number(variation.price ?? 0),
            sale_price: variation.sale_price == null ? null : Number(variation.sale_price),
            effective_price:
              variation.sale_price == null
                ? Number(variation.price ?? 0)
                : Number(variation.sale_price),
            in_stock: Number(variation.stock_quantity ?? 0) > 0,
            stock_qty: Number(variation.stock_quantity ?? 0),
          }));

        return {
          found: true,
          id: String(product.id),
          name: String(product.name),
          price: Number(product.price ?? 0),
          sale_price: product.sale_price == null ? null : Number(product.sale_price),
          effective_price:
            product.sale_price == null ? Number(product.price ?? 0) : Number(product.sale_price),
          description: typeof product.description === "string" ? product.description : null,
          in_stock: Number(product.stock ?? 0) > 0,
          stock_qty: Number(product.stock ?? 0),
          product_type: String(product.product_type ?? "simple"),
          main_image: typeof product.main_image === "string" ? product.main_image : null,
          sku: typeof product.sku === "string" ? product.sku : null,
          has_variations: product.product_type === "variable",
          variations,
        };
      },
    }),

    check_discounts: makeTool({
      description:
        "Check if any products have active sale prices or promotions. " +
        "Use this when a customer asks about deals, discounts, or sales.",
      inputSchema: z.object({
        limit: z.number().optional().default(8),
      }),
      execute: async ({ limit }: { limit: number }) => {
        const { data: onSale } = await supabase
          .from("products")
          .select("id, name, price, sale_price, main_image")
          .eq("shop_id", shop.id)
          .eq("is_active", true)
          .not("sale_price", "is", null)
          .order("name")
          .limit(limit);

        if (!onSale || onSale.length === 0) {
          return { has_discounts: false, message: "No products are currently on sale." };
        }

        return {
          has_discounts: true,
          products: onSale.map((product: Record<string, unknown>) => {
            const price = Number(product.price ?? 0);
            const salePrice = product.sale_price == null ? price : Number(product.sale_price);

            return {
              id: String(product.id),
              name: String(product.name),
              original_price: price,
              sale_price: salePrice,
              savings: price - salePrice,
              discount_percent: price > 0 ? Math.round(((price - salePrice) / price) * 100) : 0,
              main_image:
                typeof product.main_image === "string" ? product.main_image : null,
            };
          }),
        };
      },
    }),

    take_order: makeTool({
      description:
        "Initiate the order process. Call this when a customer confirms they want to buy. " +
        "Collect their name, phone, and delivery address first, then confirm before placing.",
      inputSchema: z.object({
        step: z
          .enum(["collect_info", "confirm", "submit"])
          .describe("Order step: collect_info → confirm → submit"),
        customer_name: z.string().optional(),
        customer_phone: z.string().optional(),
        delivery_address: z.string().optional(),
        items: z
          .array(
            z.object({
              product_id: z.string(),
              name: z.string(),
              price: z.number(),
              quantity: z.number(),
              variation_id: z.string().optional(),
              variant: z.string().optional(),
            })
          )
          .optional(),
        notes: z.string().optional(),
      }),
      execute: async ({
        step,
        customer_name,
        customer_phone,
        delivery_address,
        items,
        notes,
      }: {
        step: "collect_info" | "confirm" | "submit";
        customer_name?: string;
        customer_phone?: string;
        delivery_address?: string;
        items?: Array<{
          product_id: string;
          name: string;
          price: number;
          quantity: number;
          variation_id?: string;
          variant?: string;
        }>;
        notes?: string;
      }) => {
        if (step === "collect_info") {
          return {
            status: "needs_info",
            message:
              "Please provide: 1) Your full name, 2) Your phone number, 3) Your delivery address.",
            fields_needed: ["customer_name", "customer_phone", "delivery_address"],
          };
        }

        if (step === "confirm") {
          const total = (items ?? []).reduce((sum, item) => sum + item.price * item.quantity, 0);
          return {
            status: "awaiting_confirmation",
            summary: {
              customer_name,
              customer_phone,
              delivery_address,
              items,
              total: `₱${total.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`,
              notes: notes ?? null,
            },
            message:
              "Please confirm your order details above. Reply 'confirm' to place the order, " +
              "or let me know if you'd like to make changes.",
          };
        }

        if (step === "submit") {
          if (!customer_name || !customer_phone || !items || items.length === 0) {
            return { status: "error", message: "Missing required order details." };
          }

          const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
          const items_snapshot = items.map((item) => ({
            product_id: item.product_id,
            variation_id: item.variation_id ?? null,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            variant: item.variant ?? null,
            image_url: null,
          }));

          const customer_snapshot = {
            full_name: customer_name,
            phone: customer_phone,
            address: delivery_address ?? null,
            channel: "omnichannel_ai",
          };

          const { data: existingCustomer } = await supabase
            .from("customers")
            .select("id")
            .eq("shop_id", shop.id)
            .eq("phone", customer_phone)
            .maybeSingle();

          let customerId: string | null = existingCustomer?.id ?? null;

          if (!customerId) {
            const { data: newCustomer } = await supabase
              .from("customers")
              .insert({
                shop_id: shop.id,
                name: customer_name,
                phone: customer_phone,
                preferred_channel: "web",
              })
              .select("id")
              .single();

            customerId = newCustomer?.id ?? null;
          }

          const { data: order, error } = await supabase
            .from("orders")
            .insert({
              shop_id: shop.id,
              user_id: null,
              customer_id: customerId,
              items_snapshot,
              customer_snapshot,
              subtotal,
              shipping_fee: 0,
              total: subtotal,
              notes: notes ?? null,
              payment_status: "unpaid",
              status: "pending",
              source: "storefront",
            })
            .select("id")
            .single();

          if (error) {
            return { status: "error", message: "Failed to place order. Please try again." };
          }

          return {
            status: "success",
            order_id: order.id,
            message:
              `Your order has been placed! Order reference: **${order.id.slice(0, 8).toUpperCase()}**. ` +
              `Please prepare payment of ₱${subtotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}. ` +
              `The shop will contact you at ${customer_phone} to confirm and arrange delivery.`,
          };
        }

        return { status: "error", message: "Unknown step." };
      },
    }),
  };
}

async function sendPlatformMessage({
  platform,
  platformConversationId,
  config,
  text,
  senderName,
}: {
  platform: "telegram" | "viber" | "webchat";
  platformConversationId: string;
  config: Record<string, string>;
  text: string;
  senderName: string;
}) {
  if (platform === "telegram" && config.bot_token) {
    await fetch(`https://api.telegram.org/bot${config.bot_token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: platformConversationId,
        text,
      }),
    });
  }

  if (platform === "viber" && config.auth_token) {
    await fetch("https://chatapi.viber.com/pa/send_message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Viber-Auth-Token": config.auth_token,
      },
      body: JSON.stringify({
        receiver: platformConversationId,
        min_api_version: 1,
        sender: { name: senderName },
        tracking_data: platformConversationId,
        type: "text",
        text,
      }),
    });
  }
}

async function maybeSendAIReply({
  // deno-lint-ignore no-explicit-any
  supabase,
  conversationId,
  channel,
}: {
  // deno-lint-ignore no-explicit-any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any;
  conversationId: string;
  channel: {
    shop_id: string;
    platform: "telegram" | "viber" | "webchat";
    config: Record<string, string>;
    ai_enabled?: boolean;
  };
}) {
  if (!channel.ai_enabled) return;

  const { data: conversation } = await supabase
    .from("messaging_conversations")
    .select("platform_conversation_id, status, ai_active")
    .eq("id", conversationId)
    .maybeSingle();

  if (!conversation) return;
  if (conversation.status === "archived") return;
  if (conversation.ai_active === false) return;

  const { data: shop } = await supabase
    .from("shops")
    .select("id, name")
    .eq("id", channel.shop_id)
    .maybeSingle();
  if (!shop) return;

  const { data: persona } = await supabase
    .from("ai_personas")
    .select("*")
    .eq("shop_id", shop.id)
    .maybeSingle();
  if (!persona) return;

  const { data: history } = await supabase
    .from("messaging_messages")
    .select("direction, content, content_type")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(30);

  const aiMessages = ((history ?? []) as Array<Record<string, unknown>>).map((message) => {
    const isUser = message.direction === "inbound";

    if (isUser) {
      const isImageUrl =
        message.content_type === "image" &&
        typeof message.content === "string" &&
        /^https?:\/\//i.test(message.content);

      if (isImageUrl) {
        return {
          role: "user" as const,
          content: [{ type: "image" as const, image: new URL(String(message.content)) }],
        };
      }

      return {
        role: "user" as const,
        content: String(message.content ?? ""),
      };
    }

    return {
      role: "assistant" as const,
      content: String(message.content ?? ""),
    };
  });

  const model = createGeminiModel();
  const system = buildSystemPrompt(
    shop.name,
    String(persona.description_template ?? "professional"),
    String(persona.system_prompt ?? "")
  );

  // Prefer tool-augmented responses; if tool definitions fail for any reason,
  // fall back to plain text generation so AI still replies.
  let result: { text?: string } = {};
  try {
    result = await generateText({
      model,
      system,
      messages: aiMessages,
      tools: buildAITools(supabase, shop),
      stopWhen: stepCountIs(5),
    });
  } catch (toolErr) {
    console.error("AI tool generation failed; retrying without tools", toolErr);
    result = await generateText({
      model,
      system,
      messages: aiMessages,
    });
  }

  const replyText = result.text?.trim();
  if (!replyText) return;

  await supabase.from("messaging_messages").insert({
    conversation_id: conversationId,
    direction: "outbound",
    sender_id: null,
    sender_name: String(persona.name ?? "AI Assistant"),
    content: replyText,
    content_type: "text",
    metadata: { is_ai: true, persona_name: persona.name },
  });

  if (typeof conversation.platform_conversation_id === "string" && conversation.platform_conversation_id) {
    await sendPlatformMessage({
      platform: channel.platform,
      platformConversationId: conversation.platform_conversation_id,
      config: channel.config,
      text: replyText,
      senderName: String(persona.name ?? "AI Assistant"),
    });
  }

  await supabase.from("ai_conversation_logs").insert({
    shop_id: shop.id,
    persona_id: persona.id,
    session_id: String(conversation.platform_conversation_id ?? conversationId),
    messages_count: 1,
    tokens_input: result.usage?.inputTokens ?? 0,
    tokens_output: result.usage?.outputTokens ?? 0,
  });
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
      .select("id, shop_id, is_active, ai_enabled, config, platform")
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
      normalized = await normalizeTelegram(body, (config["bot_token"] ?? null) as
        | string
        | null);
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

    try {
      await maybeSendAIReply({
        supabase,
        conversationId,
        channel: {
          shop_id: channel.shop_id,
          platform: channel.platform,
          config: channel.config as Record<string, string>,
          ai_enabled: channel.ai_enabled,
        },
      });
    } catch (aiErr) {
      console.error("Failed to generate AI reply", aiErr);
    }

    return OK({ ok: true, conversation_id: conversationId });
  } catch (err) {
    console.error("UMA webhook error", err);
    return OK({ ok: true, skipped: true, reason: "internal error" });
  }
});
