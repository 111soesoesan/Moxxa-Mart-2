"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { getMyShops } from "@/actions/shops";
import { ProductForm } from "@/components/vendor/products/ProductForm";

export default function EditProductPage() {
  const { shopSlug, productId } = useParams<{ shopSlug: string; productId: string }>();
  const [shopId, setShopId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const shops = await getMyShops();
      const shop = shops.find((s) => s.slug === shopSlug);
      if (shop) setShopId(shop.id);
      setLoading(false);
    })();
  }, [shopSlug]);

  if (loading) {
    return <div className="flex flex-1 items-center justify-center p-6 text-muted-foreground text-sm">Loading…</div>;
  }

  if (!shopId) {
    return <div className="flex flex-1 items-center justify-center p-6 text-destructive text-sm">Shop not found.</div>;
  }

  return (
    <ProductForm
      mode="edit"
      productId={productId}
      shopId={shopId}
      shopSlug={shopSlug}
    />
  );
}
