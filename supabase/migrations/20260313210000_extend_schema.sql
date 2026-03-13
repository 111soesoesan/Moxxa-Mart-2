-- ============================================================
-- Schema Extension: shops, products, billing_proofs, storage
-- ============================================================

-- ─── EXTEND SHOPS ───────────────────────────────────────────
ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS cover_url              TEXT,
  ADD COLUMN IF NOT EXISTS phone                  TEXT,
  ADD COLUMN IF NOT EXISTS location               TEXT,
  ADD COLUMN IF NOT EXISTS delivery_policy        TEXT,
  ADD COLUMN IF NOT EXISTS payment_info           JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS allow_guest_purchase   BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS status                 TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','pending','active','rejected','suspended')),
  ADD COLUMN IF NOT EXISTS inspection_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason       TEXT,
  ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;

-- Update shop visibility: owners can always see their own shops
DROP POLICY IF EXISTS "shops_select_active" ON public.shops;
CREATE POLICY "shops_select_active" ON public.shops
  FOR SELECT USING (status = 'active' OR auth.uid() = owner_id);

-- ─── EXTEND PRODUCTS ────────────────────────────────────────
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS category           TEXT,
  ADD COLUMN IF NOT EXISTS condition          TEXT NOT NULL DEFAULT 'new'
    CHECK (condition IN ('new','used_like_new','used_good','used_fair')),
  ADD COLUMN IF NOT EXISTS list_on_marketplace BOOLEAN NOT NULL DEFAULT TRUE;

-- Update product visibility: shop owner can see all their products
DROP POLICY IF EXISTS "products_select_active" ON public.products;
CREATE POLICY "products_select_active" ON public.products
  FOR SELECT USING (
    is_active = TRUE
    OR auth.uid() = (SELECT owner_id FROM public.shops WHERE id = shop_id)
  );

-- ─── BILLING PROOFS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.billing_proofs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id        UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  amount         NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  screenshot_url TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','verified','rejected')),
  admin_notes    TEXT,
  verified_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.billing_proofs ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_billing_proofs_updated_at
  BEFORE UPDATE ON public.billing_proofs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "billing_proofs_select_own" ON public.billing_proofs
  FOR SELECT USING (auth.uid() = (SELECT owner_id FROM public.shops WHERE id = shop_id));

CREATE POLICY "billing_proofs_insert_own" ON public.billing_proofs
  FOR INSERT WITH CHECK (auth.uid() = (SELECT owner_id FROM public.shops WHERE id = shop_id));

-- ─── STORAGE BUCKETS ────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
  VALUES ('product-images', 'product-images', true)
  ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
  VALUES ('shop-assets', 'shop-assets', true)
  ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
  VALUES ('payment-proofs', 'payment-proofs', false)
  ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
  VALUES ('billing-proofs', 'billing-proofs', false)
  ON CONFLICT (id) DO NOTHING;

-- Storage RLS: product images (public read, auth upload)
CREATE POLICY "product_images_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images');

CREATE POLICY "product_images_auth_upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');

CREATE POLICY "product_images_auth_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');

-- Storage RLS: shop assets (public read, auth upload)
CREATE POLICY "shop_assets_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'shop-assets');

CREATE POLICY "shop_assets_auth_upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'shop-assets' AND auth.role() = 'authenticated');

-- Storage RLS: payment proofs (anyone can upload, auth+service can read)
CREATE POLICY "payment_proofs_any_upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'payment-proofs');

CREATE POLICY "payment_proofs_auth_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'payment-proofs' AND auth.role() = 'authenticated');

-- Storage RLS: billing proofs (auth upload and read)
CREATE POLICY "billing_proofs_auth_upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'billing-proofs' AND auth.role() = 'authenticated');

CREATE POLICY "billing_proofs_auth_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'billing-proofs' AND auth.role() = 'authenticated');
