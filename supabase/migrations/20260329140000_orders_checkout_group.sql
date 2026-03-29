-- Link orders created in the same multi-vendor marketplace checkout for support and UX.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS checkout_group_id uuid;

COMMENT ON COLUMN public.orders.checkout_group_id IS
  'Same UUID on all order rows placed together in one customer checkout (multi-shop cart).';

CREATE INDEX IF NOT EXISTS idx_orders_checkout_group_id
  ON public.orders (checkout_group_id)
  WHERE checkout_group_id IS NOT NULL;
