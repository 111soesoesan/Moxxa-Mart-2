import { notFound } from "next/navigation";
import { getShopBySlug } from "@/actions/shops";
import { createServiceClient } from "@/lib/supabase/server";
import { ShopHeader } from "@/components/shop/ShopHeader";
import { PromotionBar } from "@/components/shop/PromotionBar";
import { ShopSecondaryNav } from "@/components/shop/ShopSecondaryNav";
import { WebChatWidget } from "@/components/storefront/WebChatWidget";
import { AIChatWidget } from "@/components/storefront/AIChatWidget";

type Props = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

export default async function ShopLayout({ children, params }: Props) {
  const { slug } = await params;
  const shop = await getShopBySlug(slug);
  if (!shop) notFound();

  const supabase = (await createServiceClient()) as any;

  const [{ data: channel }, { data: persona }] = await Promise.all([
    supabase
      .from("messaging_channels")
      .select("id, is_active")
      .eq("shop_id", shop.id)
      .eq("platform", "webchat")
      .single(),
    supabase
      .from("ai_personas")
      .select("name, greeting_message, is_active")
      .eq("shop_id", shop.id)
      .eq("is_active", true)
      .single(),
  ]);

  const webchatActive = channel?.is_active ?? false;
  const aiActive = persona?.is_active ?? false;

  return (
    <div>
      <ShopHeader shop={shop} />

      {shop.promotion_enabled && (
        <PromotionBar
          title={shop.promotion_title}
          body={shop.promotion_body}
          buttonText={shop.promotion_button_text}
          buttonLink={shop.promotion_button_link}
        />
      )}

      <ShopSecondaryNav shopSlug={shop.slug} />

      {children}

      {webchatActive && <WebChatWidget shopSlug={shop.slug} shopName={shop.name} />}

      {aiActive && !webchatActive && (
        <AIChatWidget
          shopSlug={shop.slug}
          shopName={shop.name}
          personaName={persona.name}
          greetingMessage={persona.greeting_message}
        />
      )}
    </div>
  );
}
