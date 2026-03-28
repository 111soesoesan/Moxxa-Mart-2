import { tool } from "npm:ai";
import { createGoogleGenerativeAI } from "npm:@ai-sdk/google";
import { z } from "npm:zod";

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

export function buildSystemPrompt(
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
- Be concise. Avoid long paragraphs; use bullet points for product details when helpful.
- If a customer asks to order, use the take_order tool to collect their info step by step.
- If you don't know something about a product, use the search_products or get_product_details tool.
- Never make up prices, stock levels, or product attributes; always check the tools.
- If asked something unrelated to shopping or this store, politely redirect.

${customInstructions ? `ADDITIONAL INSTRUCTIONS FROM ${shopName.toUpperCase()}:\n${customInstructions}` : ""}`.trim();
}

export function createGeminiModel() {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey?.trim()) throw new Error("GEMINI_API_KEY is not configured");

  const google = createGoogleGenerativeAI({ apiKey });
  return google("gemini-2.5-flash");
}

// deno-lint-ignore no-explicit-any
export function buildAITools(supabase: any, shop: { id: string; name: string }) {
  // deno-lint-ignore no-explicit-any
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
