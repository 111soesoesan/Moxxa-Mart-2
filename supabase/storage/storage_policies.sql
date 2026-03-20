-- ============================================================
-- MOXXA MART — STORAGE OBJECT POLICIES
-- ============================================================
-- All policies are on storage.objects filtered by bucket_id.
-- NOTE: storage.objects does NOT have RLS enabled by default;
--       these policies apply to Supabase Storage's built-in
--       policy engine on the storage schema.
-- ============================================================


-- ─── product-images (PUBLIC bucket) ─────────────────────────
-- Anyone can read product images (public CDN access).
CREATE POLICY "product_images_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

-- Only authenticated users can upload product images.
CREATE POLICY "product_images_auth_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');

-- Only authenticated users can delete product images.
CREATE POLICY "product_images_auth_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');


-- ─── shop-assets (PUBLIC bucket) ────────────────────────────
-- Anyone can read shop assets (logos, banners, etc.).
CREATE POLICY "shop_assets_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'shop-assets');

CREATE POLICY "shop_assets_auth_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'shop-assets' AND auth.role() = 'authenticated');


-- ─── blog-images (PUBLIC bucket) ────────────────────────────
-- NOTE: No explicit storage policy found in migrations for blog-images.
-- Bucket was commented out in migration 20260315120000.
-- Assumed to be handled via Supabase Dashboard or inherits public read.
-- TODO: Add explicit policies if blog image uploads are implemented.


-- ─── payment-proofs (PRIVATE bucket) ────────────────────────
-- Anyone can upload a payment proof (supports guest checkout).
CREATE POLICY "payment_proofs_any_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'payment-proofs');

-- Only authenticated users can read payment proofs.
CREATE POLICY "payment_proofs_auth_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'payment-proofs' AND auth.role() = 'authenticated');


-- ─── billing-proofs (PRIVATE bucket) ────────────────────────
-- Only authenticated users can upload billing proofs.
CREATE POLICY "billing_proofs_auth_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'billing-proofs' AND auth.role() = 'authenticated');

-- Only authenticated users can read billing proofs.
CREATE POLICY "billing_proofs_auth_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'billing-proofs' AND auth.role() = 'authenticated');
