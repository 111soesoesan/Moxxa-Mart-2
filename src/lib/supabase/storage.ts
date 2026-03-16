"use client";

import { createClient } from "./client";

type Bucket = "product-images" | "shop-assets" | "payment-proofs" | "billing-proofs";

async function uploadFile(bucket: Bucket, path: string, file: File): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: true,
    cacheControl: "3600",
  });
  if (error) throw new Error(error.message);
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
  return urlData.publicUrl;
}

export async function uploadProductImage(file: File, shopId: string, productId: string, index: number): Promise<string> {
  const ext = file.name.split(".").pop();
  return uploadFile("product-images", `${shopId}/${productId}/${index}.${ext}`, file);
}

export async function uploadShopLogo(file: File, shopId: string): Promise<string> {
  const ext = file.name.split(".").pop();
  return uploadFile("shop-assets", `${shopId}/logo.${ext}`, file);
}

export async function uploadShopCover(file: File, shopId: string): Promise<string> {
  const ext = file.name.split(".").pop();
  return uploadFile("shop-assets", `${shopId}/cover.${ext}`, file);
}

export async function uploadShopProfileImage(file: File, shopId: string): Promise<string> {
  const ext = file.name.split(".").pop();
  return uploadFile("shop-assets", `${shopId}/profile.${ext}`, file);
}

export async function uploadShopBanner(file: File, shopId: string): Promise<string> {
  const ext = file.name.split(".").pop();
  return uploadFile("shop-assets", `${shopId}/banner.${ext}`, file);
}

export async function uploadPaymentProof(file: File, orderId: string): Promise<string> {
  const supabase = createClient();
  const ext = file.name.split(".").pop();
  const path = `${orderId}/${Date.now()}.${ext}`;
  const { data, error } = await supabase.storage.from("payment-proofs").upload(path, file, { upsert: true });
  if (error) throw new Error(error.message);
  const { data: signedUrl } = await supabase.storage.from("payment-proofs").createSignedUrl(data.path, 60 * 60 * 24 * 7);
  return signedUrl?.signedUrl ?? "";
}

export async function uploadBlogImage(file: File, shopId: string, blogId: string, index: number): Promise<string> {
  const ext = file.name.split(".").pop();
  return uploadFile("blog-images" as Bucket, `${shopId}/${blogId}/${index}.${ext}`, file);
}

export async function uploadBillingProof(file: File, shopId: string): Promise<string> {
  const supabase = createClient();
  const ext = file.name.split(".").pop();
  const path = `${shopId}/${Date.now()}.${ext}`;
  const { data, error } = await supabase.storage.from("billing-proofs").upload(path, file, { upsert: true });
  if (error) throw new Error(error.message);
  const { data: signedUrl } = await supabase.storage.from("billing-proofs").createSignedUrl(data.path, 60 * 60 * 24 * 7);
  return signedUrl?.signedUrl ?? "";
}
