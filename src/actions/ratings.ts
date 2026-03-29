"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function setShopRating(shopId: string, stars: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to rate this shop." };
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) return { error: "Choose a rating from 1 to 5 stars." };

  const { data: shop, error: shopErr } = await supabase
    .from("shops")
    .select("slug, owner_id, status")
    .eq("id", shopId)
    .single();
  if (shopErr || !shop) return { error: "Shop not found." };
  if (shop.status !== "active") return { error: "This shop cannot be rated." };
  if (shop.owner_id === user.id) return { error: "You cannot rate your own shop." };

  const { error } = await supabase.from("shop_ratings").upsert(
    { shop_id: shopId, user_id: user.id, stars },
    { onConflict: "user_id,shop_id" }
  );
  if (error) return { error: error.message };

  revalidatePath(`/shop/${shop.slug}`);
  revalidatePath("/shops");
  revalidatePath("/explore");
  return { success: true as const };
}

export async function setProductRating(productId: string, stars: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to rate this product." };
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) return { error: "Choose a rating from 1 to 5 stars." };

  const { data: product, error: pErr } = await supabase
    .from("products")
    .select("id, is_active, list_on_marketplace, shops(owner_id, status)")
    .eq("id", productId)
    .single();

  if (pErr || !product) return { error: "Product not found." };
  const shop = product.shops as { owner_id: string; status: string } | null;
  if (!shop) return { error: "Product not found." };
  if (shop.status !== "active" || !product.is_active || !product.list_on_marketplace) {
    return { error: "This product cannot be rated." };
  }
  if (shop.owner_id === user.id) return { error: "You cannot rate your own product." };

  const { error } = await supabase.from("product_ratings").upsert(
    { product_id: productId, user_id: user.id, stars },
    { onConflict: "user_id,product_id" }
  );
  if (error) return { error: error.message };

  revalidatePath(`/product/${productId}`);
  revalidatePath("/products");
  revalidatePath("/explore");
  revalidatePath("/search");
  return { success: true as const };
}

export async function getViewerShopRatingState(shopId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { kind: "guest" as const, myStars: null as number | null };

  const { data: shop } = await supabase.from("shops").select("owner_id").eq("id", shopId).single();
  if (!shop) return { kind: "guest" as const, myStars: null };
  if (shop.owner_id === user.id) return { kind: "owner" as const, myStars: null };

  const { data: row } = await supabase
    .from("shop_ratings")
    .select("stars")
    .eq("shop_id", shopId)
    .eq("user_id", user.id)
    .maybeSingle();

  return { kind: "rater" as const, myStars: row?.stars ?? null };
}

export async function getViewerProductRatingState(productId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { kind: "guest" as const, myStars: null as number | null };

  const { data: product } = await supabase
    .from("products")
    .select("shops(owner_id)")
    .eq("id", productId)
    .maybeSingle();
  if (!product) return { kind: "guest" as const, myStars: null as number | null };
  const ownerId = (product.shops as { owner_id: string } | null)?.owner_id;
  if (ownerId === user.id) return { kind: "owner" as const, myStars: null };

  const { data: row } = await supabase
    .from("product_ratings")
    .select("stars")
    .eq("product_id", productId)
    .eq("user_id", user.id)
    .maybeSingle();

  return { kind: "rater" as const, myStars: row?.stars ?? null };
}
