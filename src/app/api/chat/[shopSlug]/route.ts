import { streamText, tool } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";

// ─── Description template → base personality ─────────────────────────────────

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

// ─── Core Moxxa Mart rules (always injected) ──────────────────────────────────

function buildSystemPrompt(
  shopName: string,
  template: string,
  customInstructions: string
): string {
  const persona = TEMPLATE_PERSONAS[template] ?? TEMPLATE_PERSONAS.professional;

  return `${persona}

You are the AI assistant for **${shopName}**, a shop on Moxxa Mart.

CORE RULES:
- Only recommend products from this shop's catalog. Never suggest products from other stores.
- Currency is Philippine Peso (₱). Always display prices in this format.
- Be concise. Avoid long paragraphs — use bullet points for product details when helpful.
- If a customer asks to order, use the take_order tool to collect their info step by step.
- If you don't know something about a product, use the search_products or get_product_details tool.
- Never make up prices, stock levels, or product attributes — always check the tools.
- If asked something unrelated to shopping or this store, politely redirect.

${customInstructions ? `ADDITIONAL INSTRUCTIONS FROM ${shopName.toUpperCase()}:\n${customInstructions}` : ""}`.trim();
}

// ─── POST /api/chat/[shopSlug] ────────────────────────────────────────────────

export async function POST(
  req: Request,
  { params }: { params: Promise<{ shopSlug: string }> }
) {
  const { shopSlug } = await params;

  try {
    const body = await req.json();
    const { messages, sessionId } = body as {
      messages: { role: string; content: string }[];
      sessionId?: string;
    };

    const supabaseTyped = await createServiceClient();
    const supabase = supabaseTyped as any;

    // Fetch shop
    const { data: shop } = await supabaseTyped
      .from("shops")
      .select("id, name")
      .eq("slug", shopSlug)
      .single();

    if (!shop) {
      return new Response("Shop not found", { status: 404 });
    }

    // Fetch active persona
    const { data: persona } = await supabase
      .from("ai_personas")
      .select("*")
      .eq("shop_id", shop.id)
      .eq("is_active", true)
      .single();

    if (!persona) {
      return new Response("AI assistant not enabled for this shop", { status: 404 });
    }

    const openai = createOpenAI({
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY!,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    });

    const systemPrompt = buildSystemPrompt(
      shop.name,
      persona.description_template,
      persona.system_prompt
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const streamOptions: any = {
      model: openai("gpt-4o-mini"),
      system: systemPrompt,
      messages: messages as any,
      temperature: parseFloat(persona.temperature) || 0.7,
      maxSteps: 5,
      tools: {
        // ── search_products ──────────────────────────────────
        search_products: tool({
          description:
            "Search the shop's product catalog by keyword, category, or description. " +
            "Use this when a customer asks what products are available or describes what they want.",
          parameters: z.object({
            query: z.string().describe("Search query (product name, category, or description)"),
            limit: z.number().optional().default(6).describe("Max results to return"),
          }),
          execute: async ({ query, limit }: { query: string; limit: number }) => {
            const { data: products } = await supabaseTyped
              .from("products")
              .select(
                "id, name, price, sale_price, description, stock, product_type, main_image, sku"
              )
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
              products: products.map((p) => ({
                id: p.id,
                name: p.name,
                price: p.price,
                sale_price: p.sale_price,
                effective_price: p.sale_price ?? p.price,
                description: p.description?.slice(0, 200) ?? null,
                in_stock: (p.stock ?? 0) > 0,
                main_image: p.main_image,
                product_type: p.product_type,
                sku: p.sku,
              })),
            };
          },
        }),

        // ── get_product_details ──────────────────────────────
        get_product_details: tool({
          description:
            "Get full details for a specific product including all variations, sizes, colors, " +
            "and stock levels. Use this when a customer wants to know more about a specific item.",
          parameters: z.object({
            product_id: z.string().describe("The product ID to look up"),
          }),
          execute: async ({ product_id }: { product_id: string }) => {
            const { data: product } = await supabaseTyped
              .from("products")
              .select(
                `id, name, price, sale_price, description, stock, product_type,
                 main_image, sku, track_inventory,
                 product_variations(id, attribute_combination, price, sale_price, stock_quantity, is_active, image_url),
                 product_categories(category_id, categories(name))`
              )
              .eq("id", product_id)
              .eq("shop_id", shop.id)
              .single();

            if (!product) return { found: false };

            const p = product as any;
            const variations = (p.product_variations ?? [])
              .filter((v: any) => v.is_active)
              .map((v: any) => ({
                id: v.id,
                attributes: v.attribute_combination,
                price: v.price,
                sale_price: v.sale_price,
                effective_price: v.sale_price ?? v.price,
                in_stock: (v.stock_quantity ?? 0) > 0,
                stock_qty: v.stock_quantity,
              }));

            return {
              found: true,
              id: p.id,
              name: p.name,
              price: p.price,
              sale_price: p.sale_price,
              effective_price: p.sale_price ?? p.price,
              description: p.description,
              in_stock: (p.stock ?? 0) > 0,
              stock_qty: p.stock,
              product_type: p.product_type,
              main_image: p.main_image,
              sku: p.sku,
              has_variations: p.product_type === "variable",
              variations,
            };
          },
        }),

        // ── check_discounts ──────────────────────────────────
        check_discounts: tool({
          description:
            "Check if any products have active sale prices or promotions. " +
            "Use this when a customer asks about deals, discounts, or sales.",
          parameters: z.object({
            limit: z.number().optional().default(8),
          }),
          execute: async ({ limit }: { limit: number }) => {
            const { data: onSale } = await supabaseTyped
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
              products: onSale.map((p) => ({
                id: p.id,
                name: p.name,
                original_price: p.price,
                sale_price: p.sale_price,
                savings: p.price - (p.sale_price ?? p.price),
                discount_percent: Math.round(
                  ((p.price - (p.sale_price ?? p.price)) / p.price) * 100
                ),
                main_image: p.main_image,
              })),
            };
          },
        }),

        // ── take_order ───────────────────────────────────────
        take_order: tool({
          description:
            "Initiate the order process. Call this when a customer confirms they want to buy. " +
            "Collect their name, phone, and delivery address first, then confirm before placing.",
          parameters: z.object({
            step: z
              .enum(["collect_info", "confirm", "submit"])
              .describe("Order step: collect_info → confirm → submit"),
            customer_name: z.string().optional().describe("Customer's full name"),
            customer_phone: z.string().optional().describe("Customer's phone number"),
            delivery_address: z.string().optional().describe("Delivery address"),
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
              .optional()
              .describe("Items the customer wants to order"),
            notes: z.string().optional().describe("Special instructions or notes"),
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
            items?: { product_id: string; name: string; price: number; quantity: number; variation_id?: string; variant?: string }[];
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
              const total = (items ?? []).reduce((s, i) => s + i.price * i.quantity, 0);
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

              const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
              const items_snapshot = items.map((i) => ({
                product_id: i.product_id,
                variation_id: i.variation_id ?? null,
                name: i.name,
                price: i.price,
                quantity: i.quantity,
                variant: i.variant ?? null,
                image_url: null,
              }));

              const customer_snapshot = {
                full_name: customer_name,
                phone: customer_phone,
                address: delivery_address ?? null,
                channel: "ai_chat",
              };

              // Get or create customer
              const { data: existingCustomer } = await supabaseTyped
                .from("customers")
                .select("id")
                .eq("shop_id", shop.id)
                .eq("phone", customer_phone)
                .single();

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
                  `Your order has been placed! 🎉 Order reference: **${order.id.slice(0, 8).toUpperCase()}**. ` +
                  `Please prepare payment of ₱${subtotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}. ` +
                  `The shop will contact you at ${customer_phone} to confirm and arrange delivery.`,
              };
            }

            return { status: "error", message: "Unknown step." };
          },
        }),
      },

      onFinish: async ({ usage }: { usage?: { promptTokens?: number; completionTokens?: number } }) => {
        if (!sessionId) return;
        try {
          const svc = await createServiceClient();
          const svcAny = svc as any;
          const { data: existing } = await svcAny
            .from("ai_conversation_logs")
            .select("id, messages_count, tokens_input, tokens_output")
            .eq("shop_id", shop.id)
            .eq("session_id", sessionId)
            .single();

          if (existing) {
            await svcAny
              .from("ai_conversation_logs")
              .update({
                messages_count: existing.messages_count + 1,
                tokens_input: existing.tokens_input + (usage?.promptTokens ?? 0),
                tokens_output: existing.tokens_output + (usage?.completionTokens ?? 0),
              })
              .eq("id", existing.id);
          } else {
            await svcAny.from("ai_conversation_logs").insert({
              shop_id: shop.id,
              persona_id: persona.id,
              session_id: sessionId,
              messages_count: 1,
              tokens_input: usage?.promptTokens ?? 0,
              tokens_output: usage?.completionTokens ?? 0,
            });
          }
        } catch {
          // Non-critical: don't fail the stream on log errors
        }
      },
    };

    const result = streamText(streamOptions);

    return result.toDataStreamResponse();
  } catch (err) {
    console.error("[AI Chat] Error:", err);
    return new Response("Internal server error", { status: 500 });
  }
}
