-- ============================================================
-- chat-images storage bucket (for messaging image media)
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
  VALUES ('chat-images', 'chat-images', TRUE)
  ON CONFLICT (id) DO NOTHING;

-- Public read so storefront customers can display images.
CREATE POLICY "chat_images_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'chat-images');

-- Allow authenticated users (vendors) to upload.
-- Customer webchat image uploads are performed server-side
-- with service role; that role is also permitted.
CREATE POLICY "chat_images_insert_authenticated_or_service"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'chat-images'
    AND auth.role() IN ('authenticated', 'service_role')
  );

-- Optional: allow delete from same roles (useful for overwrites/cleanup).
CREATE POLICY "chat_images_delete_authenticated_or_service"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'chat-images'
    AND auth.role() IN ('authenticated', 'service_role')
  );

