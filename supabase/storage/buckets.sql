-- ============================================================
-- MOXXA MART — STORAGE BUCKETS
-- ============================================================
-- All buckets created via Supabase Storage.
-- Run in the Supabase dashboard SQL editor if needed.
-- ============================================================

-- Public buckets (files accessible without authentication)
INSERT INTO storage.buckets (id, name, public)
  VALUES ('product-images', 'product-images', TRUE)
  ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
  VALUES ('shop-assets', 'shop-assets', TRUE)
  ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
  VALUES ('blog-images', 'blog-images', TRUE)
  ON CONFLICT (id) DO NOTHING;

-- Private buckets (files not publicly accessible via URL)
INSERT INTO storage.buckets (id, name, public)
  VALUES ('payment-proofs', 'payment-proofs', FALSE)
  ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
  VALUES ('billing-proofs', 'billing-proofs', FALSE)
  ON CONFLICT (id) DO NOTHING;

-- Messaging buckets
INSERT INTO storage.buckets (id, name, public)
  VALUES ('chat-images', 'chat-images', TRUE)
  ON CONFLICT (id) DO NOTHING;
