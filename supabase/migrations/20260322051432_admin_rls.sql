-- ============================================================
-- Migration: Add Admin RLS Policies
-- Description: Introduces is_admin() helper and admin_all policies
-- ============================================================

-- 1. Create is_admin() helper function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- 2. Add admin_all policies to all relevant tables
CREATE POLICY "admin_all_shops" ON public.shops FOR ALL USING (public.is_admin());
CREATE POLICY "admin_all_products" ON public.products FOR ALL USING (public.is_admin());
CREATE POLICY "admin_all_orders" ON public.orders FOR ALL USING (public.is_admin());
CREATE POLICY "admin_all_billing_proofs" ON public.billing_proofs FOR ALL USING (public.is_admin());
CREATE POLICY "admin_all_payment_methods" ON public.payment_methods FOR ALL USING (public.is_admin());
CREATE POLICY "admin_all_shop_blogs" ON public.shop_blogs FOR ALL USING (public.is_admin());
CREATE POLICY "admin_all_blog_likes" ON public.blog_likes FOR ALL USING (public.is_admin());
CREATE POLICY "admin_all_blog_comments" ON public.blog_comments FOR ALL USING (public.is_admin());
CREATE POLICY "admin_all_blog_shares" ON public.blog_shares FOR ALL USING (public.is_admin());
CREATE POLICY "admin_all_inventory" ON public.inventory FOR ALL USING (public.is_admin());
CREATE POLICY "admin_all_inventory_logs" ON public.inventory_logs FOR ALL USING (public.is_admin());
CREATE POLICY "admin_all_customers" ON public.customers FOR ALL USING (public.is_admin());
CREATE POLICY "admin_all_customer_activity" ON public.customer_activity FOR ALL USING (public.is_admin());
CREATE POLICY "admin_all_categories" ON public.categories FOR ALL USING (public.is_admin());
CREATE POLICY "admin_all_attributes" ON public.attributes FOR ALL USING (public.is_admin());
CREATE POLICY "admin_all_attribute_items" ON public.attribute_items FOR ALL USING (public.is_admin());
CREATE POLICY "admin_all_product_categories" ON public.product_categories FOR ALL USING (public.is_admin());
CREATE POLICY "admin_all_product_variations" ON public.product_variations FOR ALL USING (public.is_admin());
