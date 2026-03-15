"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type BlogFormData = {
  title: string;
  body: string;
  category?: string;
  image_urls?: string[];
  published?: boolean;
};

export type BlogWithEngagement = {
  id: string;
  shop_id: string;
  author_id: string | null;
  title: string;
  body: string;
  image_urls: string[];
  category: string | null;
  published: boolean;
  created_at: string;
  updated_at: string;
  like_count: number;
  comment_count: number;
  share_count: number;
  user_liked?: boolean;
  profiles?: { full_name: string | null; avatar_url: string | null } | null;
};

// ─── VENDOR CRUD ───────────────────────────────────────────────

export async function createBlog(shopId: string, data: BlogFormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: shop } = await supabase
    .from("shops")
    .select("owner_id, slug")
    .eq("id", shopId)
    .single();

  if (!shop || shop.owner_id !== user.id) return { error: "Unauthorized" };

  const { data: blog, error } = await supabase
    .from("shop_blogs")
    .insert({
      shop_id: shopId,
      author_id: user.id,
      title: data.title,
      body: data.body,
      category: data.category || null,
      image_urls: data.image_urls ?? [],
      published: data.published ?? true,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath(`/vendor/${shop.slug}/blogs`);
  revalidatePath(`/shop/${shop.slug}/blogs`);
  return { data: blog };
}

export async function updateBlog(blogId: string, data: Partial<BlogFormData>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: existing } = await supabase
    .from("shop_blogs")
    .select("shop_id, shops(owner_id, slug)")
    .eq("id", blogId)
    .single();

  if (!existing) return { error: "Blog not found" };
  const shop = existing.shops as { owner_id: string; slug: string } | null;
  if (!shop || shop.owner_id !== user.id) return { error: "Unauthorized" };

  const { data: blog, error } = await supabase
    .from("shop_blogs")
    .update({
      title: data.title,
      body: data.body,
      category: data.category ?? null,
      image_urls: data.image_urls,
      published: data.published,
    })
    .eq("id", blogId)
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath(`/vendor/${shop.slug}/blogs`);
  revalidatePath(`/shop/${shop.slug}/blogs`);
  revalidatePath(`/shop/${shop.slug}/blogs/${blogId}`);
  return { data: blog };
}

export async function deleteBlog(blogId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: existing } = await supabase
    .from("shop_blogs")
    .select("shop_id, shops(owner_id, slug)")
    .eq("id", blogId)
    .single();

  if (!existing) return { error: "Blog not found" };
  const shop = existing.shops as { owner_id: string; slug: string } | null;
  if (!shop || shop.owner_id !== user.id) return { error: "Unauthorized" };

  const { error } = await supabase.from("shop_blogs").delete().eq("id", blogId);
  if (error) return { error: error.message };

  revalidatePath(`/vendor/${shop.slug}/blogs`);
  revalidatePath(`/shop/${shop.slug}/blogs`);
  return { success: true };
}

export async function getShopBlogsForVendor(shopId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("shop_blogs")
    .select("*, blog_likes(count), blog_comments(count), blog_shares(count)")
    .eq("shop_id", shopId)
    .order("created_at", { ascending: false });

  if (!data) return [];

  return data.map((b) => ({
    ...b,
    like_count: (b.blog_likes as unknown as { count: number }[])?.[0]?.count ?? 0,
    comment_count: (b.blog_comments as unknown as { count: number }[])?.[0]?.count ?? 0,
    share_count: (b.blog_shares as unknown as { count: number }[])?.[0]?.count ?? 0,
  }));
}

export async function getBlogByIdForVendor(blogId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("shop_blogs")
    .select("*")
    .eq("id", blogId)
    .single();
  return data;
}

// ─── PUBLIC READ ───────────────────────────────────────────────

export async function getShopBlogsPublic(
  shopId: string,
  opts: {
    sort?: "newest" | "oldest" | "popular" | "most-commented";
    category?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<BlogWithEngagement[]> {
  const { sort = "newest", category, limit = 20, offset = 0 } = opts;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let req = supabase
    .from("shop_blogs")
    .select("*, blog_likes(count), blog_comments(count), blog_shares(count), profiles(full_name, avatar_url)")
    .eq("shop_id", shopId)
    .eq("published", true);

  if (category) req = req.eq("category", category);

  req = req.range(offset, offset + limit - 1);

  if (sort === "newest") req = req.order("created_at", { ascending: false });
  else if (sort === "oldest") req = req.order("created_at", { ascending: true });
  else req = req.order("created_at", { ascending: false });

  const { data } = await req;
  if (!data) return [];

  const mapped: BlogWithEngagement[] = data.map((b) => ({
    ...b,
    like_count: (b.blog_likes as unknown as { count: number }[])?.[0]?.count ?? 0,
    comment_count: (b.blog_comments as unknown as { count: number }[])?.[0]?.count ?? 0,
    share_count: (b.blog_shares as unknown as { count: number }[])?.[0]?.count ?? 0,
  }));

  // Fetch which blogs the current user has liked
  if (user && mapped.length > 0) {
    const ids = mapped.map((b) => b.id);
    const { data: likes } = await supabase
      .from("blog_likes")
      .select("blog_id")
      .eq("user_id", user.id)
      .in("blog_id", ids);

    const likedSet = new Set((likes ?? []).map((l) => l.blog_id));
    mapped.forEach((b) => { b.user_liked = likedSet.has(b.id); });
  }

  // Sort by engagement counts client-side
  if (sort === "popular") mapped.sort((a, b) => b.like_count - a.like_count);
  if (sort === "most-commented") mapped.sort((a, b) => b.comment_count - a.comment_count);

  return mapped;
}

export async function getBlogWithEngagement(blogId: string): Promise<BlogWithEngagement | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("shop_blogs")
    .select("*, blog_likes(count), blog_comments(count), blog_shares(count), profiles(full_name, avatar_url)")
    .eq("id", blogId)
    .eq("published", true)
    .single();

  if (!data) return null;

  const blog: BlogWithEngagement = {
    ...data,
    like_count: (data.blog_likes as unknown as { count: number }[])?.[0]?.count ?? 0,
    comment_count: (data.blog_comments as unknown as { count: number }[])?.[0]?.count ?? 0,
    share_count: (data.blog_shares as unknown as { count: number }[])?.[0]?.count ?? 0,
  };

  if (user) {
    const { data: like } = await supabase
      .from("blog_likes")
      .select("id")
      .eq("blog_id", blogId)
      .eq("user_id", user.id)
      .maybeSingle();
    blog.user_liked = !!like;
  }

  return blog;
}

export async function getBlogComments(blogId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("blog_comments")
    .select("*, profiles(full_name, avatar_url)")
    .eq("blog_id", blogId)
    .order("created_at", { ascending: true });
  return data ?? [];
}

// ─── ENGAGEMENT ACTIONS ────────────────────────────────────────

export async function toggleLike(blogId: string): Promise<{ liked: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { liked: false, error: "Not authenticated" };

  const { data: existing } = await supabase
    .from("blog_likes")
    .select("id")
    .eq("blog_id", blogId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    await supabase.from("blog_likes").delete().eq("id", existing.id);
    return { liked: false };
  } else {
    const { error } = await supabase
      .from("blog_likes")
      .insert({ blog_id: blogId, user_id: user.id });
    if (error) return { liked: false, error: error.message };
    return { liked: true };
  }
}

export async function addComment(blogId: string, body: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data, error } = await supabase
    .from("blog_comments")
    .insert({ blog_id: blogId, author_id: user.id, body })
    .select("*, profiles(full_name, avatar_url)")
    .single();

  if (error) return { error: error.message };
  return { data };
}

export async function deleteComment(commentId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("blog_comments")
    .delete()
    .eq("id", commentId)
    .eq("author_id", user.id);

  if (error) return { error: error.message };
  return { success: true };
}

export async function trackShare(blogId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  await supabase
    .from("blog_shares")
    .insert({ blog_id: blogId, user_id: user?.id ?? null });

  return { success: true };
}
