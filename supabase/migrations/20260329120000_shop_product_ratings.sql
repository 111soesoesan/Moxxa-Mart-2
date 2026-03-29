-- Star ratings (1–5) for shops and products; aggregates stored on parent rows.

CREATE TABLE public.shop_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  stars smallint NOT NULL CHECK (stars >= 1 AND stars <= 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, shop_id)
);

CREATE TABLE public.product_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  stars smallint NOT NULL CHECK (stars >= 1 AND stars <= 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);

CREATE INDEX idx_shop_ratings_shop_id ON public.shop_ratings(shop_id);
CREATE INDEX idx_shop_ratings_user_id ON public.shop_ratings(user_id);
CREATE INDEX idx_product_ratings_product_id ON public.product_ratings(product_id);
CREATE INDEX idx_product_ratings_user_id ON public.product_ratings(user_id);

ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS rating_avg numeric(3,2),
  ADD COLUMN IF NOT EXISTS rating_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS rating_avg numeric(3,2),
  ADD COLUMN IF NOT EXISTS rating_count integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.trg_shop_ratings_refresh_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sid uuid;
  cnt int;
  av numeric;
BEGIN
  sid := COALESCE(NEW.shop_id, OLD.shop_id);
  SELECT COUNT(*)::int, COALESCE(AVG(r.stars), 0)
  INTO cnt, av
  FROM public.shop_ratings r
  WHERE r.shop_id = sid;

  UPDATE public.shops
  SET
    rating_count = cnt,
    rating_avg = CASE WHEN cnt = 0 THEN NULL ELSE ROUND(av::numeric, 2) END
  WHERE id = sid;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_product_ratings_refresh_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pid uuid;
  cnt int;
  av numeric;
BEGIN
  pid := COALESCE(NEW.product_id, OLD.product_id);
  SELECT COUNT(*)::int, COALESCE(AVG(r.stars), 0)
  INTO cnt, av
  FROM public.product_ratings r
  WHERE r.product_id = pid;

  UPDATE public.products
  SET
    rating_count = cnt,
    rating_avg = CASE WHEN cnt = 0 THEN NULL ELSE ROUND(av::numeric, 2) END
  WHERE id = pid;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER shop_ratings_set_updated_at
  BEFORE UPDATE ON public.shop_ratings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER product_ratings_set_updated_at
  BEFORE UPDATE ON public.product_ratings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER shop_ratings_refresh_stats
  AFTER INSERT OR UPDATE OR DELETE ON public.shop_ratings
  FOR EACH ROW EXECUTE FUNCTION public.trg_shop_ratings_refresh_stats();

CREATE TRIGGER product_ratings_refresh_stats
  AFTER INSERT OR UPDATE OR DELETE ON public.product_ratings
  FOR EACH ROW EXECUTE FUNCTION public.trg_product_ratings_refresh_stats();

ALTER TABLE public.shop_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shop_ratings_select_all"
  ON public.shop_ratings FOR SELECT USING (true);

CREATE POLICY "shop_ratings_insert_authenticated"
  ON public.shop_ratings FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.shops s
      WHERE s.id = shop_id AND s.status = 'active'
    )
    AND auth.uid() <> (SELECT owner_id FROM public.shops s WHERE s.id = shop_id)
  );

CREATE POLICY "shop_ratings_update_own"
  ON public.shop_ratings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "shop_ratings_delete_own"
  ON public.shop_ratings FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "product_ratings_select_all"
  ON public.product_ratings FOR SELECT USING (true);

CREATE POLICY "product_ratings_insert_authenticated"
  ON public.product_ratings FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.products p
      JOIN public.shops s ON s.id = p.shop_id
      WHERE p.id = product_id
        AND p.is_active = true
        AND p.list_on_marketplace = true
        AND s.status = 'active'
    )
    AND auth.uid() <> (
      SELECT s.owner_id
      FROM public.products p
      JOIN public.shops s ON s.id = p.shop_id
      WHERE p.id = product_id
    )
  );

CREATE POLICY "product_ratings_update_own"
  ON public.product_ratings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "product_ratings_delete_own"
  ON public.product_ratings FOR DELETE
  USING (auth.uid() = user_id);
