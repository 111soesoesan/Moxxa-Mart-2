import { notFound } from "next/navigation";
import { getShopBySlug } from "@/actions/shops";
import { ShopHeader } from "@/components/shop/ShopHeader";
import { PromotionBar } from "@/components/shop/PromotionBar";
import { ShopSecondaryNav } from "@/components/shop/ShopSecondaryNav";

type Props = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

export default async function ShopLayout({ children, params }: Props) {
  const { slug } = await params;
  const shop = await getShopBySlug(slug);
  if (!shop) notFound();

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
    </div>
  );
}
