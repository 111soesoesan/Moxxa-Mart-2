-- Add branding, promotions, and shop bio columns to shops table

ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS profile_image_url   TEXT,
  ADD COLUMN IF NOT EXISTS banner_image_url     TEXT,
  ADD COLUMN IF NOT EXISTS promotion_enabled    BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS promotion_title      TEXT,
  ADD COLUMN IF NOT EXISTS promotion_body       TEXT,
  ADD COLUMN IF NOT EXISTS promotion_button_text TEXT,
  ADD COLUMN IF NOT EXISTS promotion_button_link TEXT,
  ADD COLUMN IF NOT EXISTS shop_bio             TEXT;

-- Enforce a 200-character limit on shop_bio
ALTER TABLE shops
  DROP CONSTRAINT IF EXISTS shops_shop_bio_length,
  ADD CONSTRAINT shops_shop_bio_length CHECK (char_length(shop_bio) <= 200);
