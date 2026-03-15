-- Fix: replace erroneous trigger function that referenced non-existent public.payments
-- Context: create_default_cash_payment() should insert into public.payment_methods, not public.payments

-- 1) Replace the trigger function body
CREATE OR REPLACE FUNCTION public.create_default_cash_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Ensure the default cash payment method exists for this shop
  INSERT INTO public.payment_methods (shop_id, type, name, description, is_active)
  VALUES (NEW.id, 'cash', 'Cash on Delivery', 'Payment on delivery', TRUE);
  RETURN NEW;
END;
$$;

-- 2) Ensure trigger exists and points to the (now corrected) function
DROP TRIGGER IF EXISTS create_default_cash_on_shops ON public.shops;
CREATE TRIGGER create_default_cash_on_shops
  AFTER INSERT ON public.shops
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_cash_payment();

-- 3) Backfill for any existing shops missing the default cash method (idempotent)
INSERT INTO public.payment_methods (shop_id, type, name, description, is_active)
SELECT s.id, 'cash', 'Cash on Delivery', 'Payment on delivery', TRUE
FROM public.shops s
WHERE NOT EXISTS (
  SELECT 1 FROM public.payment_methods pm WHERE pm.shop_id = s.id AND pm.name = 'Cash on Delivery'
);
