-- ============================================================
-- Blog Tables: shop_blogs, blog_likes, blog_comments, blog_shares
-- Apply this migration in the Supabase dashboard SQL editor:
-- https://supabase.com/dashboard/project/vktnmqvrpusnfewxevlb/sql/new
-- ============================================================

-- ─── SHOP BLOGS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.shop_blogs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id     UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  author_id   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  image_urls  TEXT[] NOT NULL DEFAULT '{}',
  category    TEXT,
  published   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS shop_blogs_shop_id_idx ON public.shop_blogs(shop_id);
CREATE INDEX IF NOT EXISTS shop_blogs_created_at_idx ON public.shop_blogs(created_at DESC);

ALTER TABLE public.shop_blogs ENABLE ROW LEVEL SECURITY;

-- Anyone can read published blogs
CREATE POLICY "public read published blogs"
  ON public.shop_blogs FOR SELECT
  USING (published = true);

-- Vendor can read all their own shop's blogs (including drafts)
CREATE POLICY "vendor read own shop blogs"
  ON public.shop_blogs FOR SELECT
  USING (
    auth.uid() IN (
      SELECT owner_id FROM public.shops WHERE id = shop_id
    )
  );

-- Vendor can insert blogs for their own shop
CREATE POLICY "vendor insert blogs"
  ON public.shop_blogs FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT owner_id FROM public.shops WHERE id = shop_id
    )
  );

-- Vendor can update their own shop's blogs
CREATE POLICY "vendor update blogs"
  ON public.shop_blogs FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT owner_id FROM public.shops WHERE id = shop_id
    )
  );

-- Vendor can delete their own shop's blogs
CREATE POLICY "vendor delete blogs"
  ON public.shop_blogs FOR DELETE
  USING (
    auth.uid() IN (
      SELECT owner_id FROM public.shops WHERE id = shop_id
    )
  );

-- ─── BLOG LIKES ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.blog_likes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_id     UUID NOT NULL REFERENCES public.shop_blogs(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(blog_id, user_id)
);

CREATE INDEX IF NOT EXISTS blog_likes_blog_id_idx ON public.blog_likes(blog_id);

ALTER TABLE public.blog_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read likes"
  ON public.blog_likes FOR SELECT USING (true);

CREATE POLICY "auth users insert likes"
  ON public.blog_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "auth users delete own likes"
  ON public.blog_likes FOR DELETE
  USING (auth.uid() = user_id);

-- ─── BLOG COMMENTS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.blog_comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_id     UUID NOT NULL REFERENCES public.shop_blogs(id) ON DELETE CASCADE,
  author_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS blog_comments_blog_id_idx ON public.blog_comments(blog_id);

ALTER TABLE public.blog_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read comments"
  ON public.blog_comments FOR SELECT USING (true);

CREATE POLICY "auth users insert comments"
  ON public.blog_comments FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "auth users delete own comments"
  ON public.blog_comments FOR DELETE
  USING (auth.uid() = author_id);

-- ─── BLOG SHARES ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.blog_shares (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_id     UUID NOT NULL REFERENCES public.shop_blogs(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS blog_shares_blog_id_idx ON public.blog_shares(blog_id);

ALTER TABLE public.blog_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read shares"
  ON public.blog_shares FOR SELECT USING (true);

CREATE POLICY "anyone insert shares"
  ON public.blog_shares FOR INSERT
  WITH CHECK (true);

-- ─── UPDATED_AT TRIGGER ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER shop_blogs_updated_at
  BEFORE UPDATE ON public.shop_blogs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ─── STORAGE BUCKET ─────────────────────────────────────────
-- Run this to create the blog-images bucket (if not using the dashboard):
-- INSERT INTO storage.buckets (id, name, public) VALUES ('blog-images', 'blog-images', true)
-- ON CONFLICT (id) DO NOTHING;
