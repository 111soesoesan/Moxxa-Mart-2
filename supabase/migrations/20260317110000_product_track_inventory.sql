-- Add track_inventory flag to products table.
-- When FALSE: product is treated as always in-stock (no quantity tracking).
-- When TRUE (default): availability is governed by the inventory table.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS track_inventory BOOLEAN NOT NULL DEFAULT TRUE;
