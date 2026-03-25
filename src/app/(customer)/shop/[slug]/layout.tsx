import { notFound } from "next/navigation";
import { getShopBySlug } from "@/actions/shops";
import { createServiceClient } from "@/lib/supabase/server";
import { ShopHeader } from "@/components/shop/ShopHeader";
import { PromotionBar } from "@/components/shop/PromotionBar";
import { ShopSecondaryNav } from "@/components/shop/ShopSecondaryNav";
import { WebChatWidget } from "@/components/storefront/WebChatWidget";

type Props = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

export default async function ShopLayout({ children, params }: Props) {
  const { slug } = await params;
  const shop = await getShopBySlug(slug);
  if (!shop) notFound();

  // Generated Supabase types may lag behind messaging-channel shape.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createServiceClient()) as any;

  const { data: channel } = await supabase
    .from("messaging_channels")
    .select("id, is_active, ai_enabled")
    .eq("shop_id", shop.id)
    .eq("platform", "webchat")
    .single();

  const webchatActive = !!(channel?.is_active || channel?.ai_enabled);

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
    </div>
  );
}
