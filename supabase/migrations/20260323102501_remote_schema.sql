drop extension if exists "pg_net";

drop trigger if exists "set_billing_proofs_updated_at" on "public"."billing_proofs";

drop trigger if exists "customer_update_timestamp" on "public"."customers";

drop trigger if exists "inventory_update_timestamp" on "public"."inventory";

drop trigger if exists "sync_inventory_to_variation_trigger" on "public"."inventory";

drop trigger if exists "trg_update_conversation_on_message_insert" on "public"."messaging_messages";

drop trigger if exists "deduct_inventory_on_order_confirmed" on "public"."orders";

drop trigger if exists "restore_inventory_on_order_cancelled" on "public"."orders";

drop trigger if exists "set_orders_updated_at" on "public"."orders";

drop trigger if exists "trg_adjust_customer_stats_on_order_cancel" on "public"."orders";

drop trigger if exists "trg_update_customer_stats_on_order_insert" on "public"."orders";

drop trigger if exists "set_payment_methods_updated_at" on "public"."payment_methods";

drop trigger if exists "auto_create_inventory_on_variation" on "public"."product_variations";

drop trigger if exists "set_product_variations_updated_at" on "public"."product_variations";

drop trigger if exists "auto_create_inventory" on "public"."products";

drop trigger if exists "set_products_updated_at" on "public"."products";

drop trigger if exists "set_profiles_updated_at" on "public"."profiles";

drop trigger if exists "shop_blogs_updated_at" on "public"."shop_blogs";

drop trigger if exists "create_default_cash_on_shops" on "public"."shops";

drop trigger if exists "set_shops_updated_at" on "public"."shops";

drop policy "admin_all_attribute_items" on "public"."attribute_items";

drop policy "attr_items_delete" on "public"."attribute_items";

drop policy "attr_items_insert" on "public"."attribute_items";

drop policy "attr_items_select" on "public"."attribute_items";

drop policy "attr_items_update" on "public"."attribute_items";

drop policy "admin_all_attributes" on "public"."attributes";

drop policy "attributes_delete" on "public"."attributes";

drop policy "attributes_insert" on "public"."attributes";

drop policy "attributes_select" on "public"."attributes";

drop policy "attributes_update" on "public"."attributes";

drop policy "admin_all_billing_proofs" on "public"."billing_proofs";

drop policy "billing_proofs_insert_own" on "public"."billing_proofs";

drop policy "billing_proofs_select_own" on "public"."billing_proofs";

drop policy "admin_all_blog_comments" on "public"."blog_comments";

drop policy "admin_all_blog_likes" on "public"."blog_likes";

drop policy "admin_all_blog_shares" on "public"."blog_shares";

drop policy "admin_all_categories" on "public"."categories";

drop policy "categories_delete" on "public"."categories";

drop policy "categories_insert" on "public"."categories";

drop policy "categories_select" on "public"."categories";

drop policy "categories_update" on "public"."categories";

drop policy "admin_all_customer_activity" on "public"."customer_activity";

drop policy "customer_activity_select_policy" on "public"."customer_activity";

drop policy "vendors_read_own_shop_customer_identities" on "public"."customer_identities";

drop policy "admin_all_customers" on "public"."customers";

drop policy "customers_select_policy" on "public"."customers";

drop policy "customers_update_policy" on "public"."customers";

drop policy "admin_all_inventory" on "public"."inventory";

drop policy "inventory_insert_policy" on "public"."inventory";

drop policy "inventory_select_policy" on "public"."inventory";

drop policy "inventory_update_policy" on "public"."inventory";

drop policy "admin_all_inventory_logs" on "public"."inventory_logs";

drop policy "inventory_logs_select_policy" on "public"."inventory_logs";

drop policy "vendors_manage_own_messaging_channels" on "public"."messaging_channels";

drop policy "vendors_manage_own_conversations" on "public"."messaging_conversations";

drop policy "vendors_manage_own_messages" on "public"."messaging_messages";

drop policy "admin_all_orders" on "public"."orders";

drop policy "admin_all_payment_methods" on "public"."payment_methods";

drop policy "payment_methods_delete_own" on "public"."payment_methods";

drop policy "payment_methods_insert_own" on "public"."payment_methods";

drop policy "payment_methods_select_own" on "public"."payment_methods";

drop policy "payment_methods_update_own" on "public"."payment_methods";

drop policy "admin_all_product_categories" on "public"."product_categories";

drop policy "product_cats_delete" on "public"."product_categories";

drop policy "product_cats_insert" on "public"."product_categories";

drop policy "product_cats_select" on "public"."product_categories";

drop policy "admin_all_product_variations" on "public"."product_variations";

drop policy "product_vars_delete" on "public"."product_variations";

drop policy "product_vars_insert" on "public"."product_variations";

drop policy "product_vars_select" on "public"."product_variations";

drop policy "product_vars_update" on "public"."product_variations";

drop policy "admin_all_products" on "public"."products";

drop policy "products_delete_own" on "public"."products";

drop policy "products_insert_own" on "public"."products";

drop policy "products_select_active" on "public"."products";

drop policy "products_update_own" on "public"."products";

drop policy "admin_all_shop_blogs" on "public"."shop_blogs";

drop policy "vendor delete blogs" on "public"."shop_blogs";

drop policy "vendor insert blogs" on "public"."shop_blogs";

drop policy "vendor read own shop blogs" on "public"."shop_blogs";

drop policy "vendor update blogs" on "public"."shop_blogs";

drop policy "admin_all_shops" on "public"."shops";

alter table "public"."attribute_items" drop constraint "attribute_items_attribute_id_fkey";

alter table "public"."attributes" drop constraint "attributes_shop_id_fkey";

alter table "public"."billing_proofs" drop constraint "billing_proofs_shop_id_fkey";

alter table "public"."blog_comments" drop constraint "blog_comments_author_id_fkey";

alter table "public"."blog_comments" drop constraint "blog_comments_blog_id_fkey";

alter table "public"."blog_likes" drop constraint "blog_likes_blog_id_fkey";

alter table "public"."blog_likes" drop constraint "blog_likes_user_id_fkey";

alter table "public"."blog_shares" drop constraint "blog_shares_blog_id_fkey";

alter table "public"."blog_shares" drop constraint "blog_shares_user_id_fkey";

alter table "public"."categories" drop constraint "categories_parent_id_fkey";

alter table "public"."categories" drop constraint "categories_shop_id_fkey";

alter table "public"."customer_activity" drop constraint "customer_activity_customer_id_fkey";

alter table "public"."customer_identities" drop constraint "customer_identities_customer_id_fkey";

alter table "public"."customers" drop constraint "customers_shop_id_fkey";

alter table "public"."customers" drop constraint "customers_user_id_fkey";

alter table "public"."inventory" drop constraint "inventory_product_id_fkey";

alter table "public"."inventory" drop constraint "inventory_shop_id_fkey";

alter table "public"."inventory" drop constraint "inventory_variation_id_fkey";

alter table "public"."inventory_logs" drop constraint "inventory_logs_created_by_fkey";

alter table "public"."inventory_logs" drop constraint "inventory_logs_inventory_id_fkey";

alter table "public"."messaging_channels" drop constraint "messaging_channels_shop_id_fkey";

alter table "public"."messaging_conversations" drop constraint "messaging_conversations_channel_id_fkey";

alter table "public"."messaging_conversations" drop constraint "messaging_conversations_customer_id_fkey";

alter table "public"."messaging_conversations" drop constraint "messaging_conversations_shop_id_fkey";

alter table "public"."messaging_messages" drop constraint "messaging_messages_conversation_id_fkey";

alter table "public"."orders" drop constraint "orders_customer_id_fkey";

alter table "public"."orders" drop constraint "orders_payment_method_id_fkey";

alter table "public"."orders" drop constraint "orders_shop_id_fkey";

alter table "public"."orders" drop constraint "orders_user_id_fkey";

alter table "public"."payment_methods" drop constraint "payment_methods_shop_id_fkey";

alter table "public"."product_categories" drop constraint "product_categories_category_id_fkey";

alter table "public"."product_categories" drop constraint "product_categories_product_id_fkey";

alter table "public"."product_variations" drop constraint "product_variations_product_id_fkey";

alter table "public"."products" drop constraint "products_shop_id_fkey";

alter table "public"."shop_blogs" drop constraint "shop_blogs_author_id_fkey";

alter table "public"."shop_blogs" drop constraint "shop_blogs_shop_id_fkey";

alter table "public"."shops" drop constraint "shops_owner_id_fkey";

alter table "public"."attribute_items" add constraint "attribute_items_attribute_id_fkey" FOREIGN KEY (attribute_id) REFERENCES public.attributes(id) ON DELETE CASCADE not valid;

alter table "public"."attribute_items" validate constraint "attribute_items_attribute_id_fkey";

alter table "public"."attributes" add constraint "attributes_shop_id_fkey" FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE not valid;

alter table "public"."attributes" validate constraint "attributes_shop_id_fkey";

alter table "public"."billing_proofs" add constraint "billing_proofs_shop_id_fkey" FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE not valid;

alter table "public"."billing_proofs" validate constraint "billing_proofs_shop_id_fkey";

alter table "public"."blog_comments" add constraint "blog_comments_author_id_fkey" FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."blog_comments" validate constraint "blog_comments_author_id_fkey";

alter table "public"."blog_comments" add constraint "blog_comments_blog_id_fkey" FOREIGN KEY (blog_id) REFERENCES public.shop_blogs(id) ON DELETE CASCADE not valid;

alter table "public"."blog_comments" validate constraint "blog_comments_blog_id_fkey";

alter table "public"."blog_likes" add constraint "blog_likes_blog_id_fkey" FOREIGN KEY (blog_id) REFERENCES public.shop_blogs(id) ON DELETE CASCADE not valid;

alter table "public"."blog_likes" validate constraint "blog_likes_blog_id_fkey";

alter table "public"."blog_likes" add constraint "blog_likes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."blog_likes" validate constraint "blog_likes_user_id_fkey";

alter table "public"."blog_shares" add constraint "blog_shares_blog_id_fkey" FOREIGN KEY (blog_id) REFERENCES public.shop_blogs(id) ON DELETE CASCADE not valid;

alter table "public"."blog_shares" validate constraint "blog_shares_blog_id_fkey";

alter table "public"."blog_shares" add constraint "blog_shares_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL not valid;

alter table "public"."blog_shares" validate constraint "blog_shares_user_id_fkey";

alter table "public"."categories" add constraint "categories_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES public.categories(id) ON DELETE SET NULL not valid;

alter table "public"."categories" validate constraint "categories_parent_id_fkey";

alter table "public"."categories" add constraint "categories_shop_id_fkey" FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE not valid;

alter table "public"."categories" validate constraint "categories_shop_id_fkey";

alter table "public"."customer_activity" add constraint "customer_activity_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."customer_activity" validate constraint "customer_activity_customer_id_fkey";

alter table "public"."customer_identities" add constraint "customer_identities_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."customer_identities" validate constraint "customer_identities_customer_id_fkey";

alter table "public"."customers" add constraint "customers_shop_id_fkey" FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."customers" validate constraint "customers_shop_id_fkey";

alter table "public"."customers" add constraint "customers_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON UPDATE CASCADE ON DELETE SET NULL not valid;

alter table "public"."customers" validate constraint "customers_user_id_fkey";

alter table "public"."inventory" add constraint "inventory_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."inventory" validate constraint "inventory_product_id_fkey";

alter table "public"."inventory" add constraint "inventory_shop_id_fkey" FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."inventory" validate constraint "inventory_shop_id_fkey";

alter table "public"."inventory" add constraint "inventory_variation_id_fkey" FOREIGN KEY (variation_id) REFERENCES public.product_variations(id) ON DELETE CASCADE not valid;

alter table "public"."inventory" validate constraint "inventory_variation_id_fkey";

alter table "public"."inventory_logs" add constraint "inventory_logs_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON UPDATE CASCADE ON DELETE SET NULL not valid;

alter table "public"."inventory_logs" validate constraint "inventory_logs_created_by_fkey";

alter table "public"."inventory_logs" add constraint "inventory_logs_inventory_id_fkey" FOREIGN KEY (inventory_id) REFERENCES public.inventory(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."inventory_logs" validate constraint "inventory_logs_inventory_id_fkey";

alter table "public"."messaging_channels" add constraint "messaging_channels_shop_id_fkey" FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE not valid;

alter table "public"."messaging_channels" validate constraint "messaging_channels_shop_id_fkey";

alter table "public"."messaging_conversations" add constraint "messaging_conversations_channel_id_fkey" FOREIGN KEY (channel_id) REFERENCES public.messaging_channels(id) ON DELETE SET NULL not valid;

alter table "public"."messaging_conversations" validate constraint "messaging_conversations_channel_id_fkey";

alter table "public"."messaging_conversations" add constraint "messaging_conversations_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL not valid;

alter table "public"."messaging_conversations" validate constraint "messaging_conversations_customer_id_fkey";

alter table "public"."messaging_conversations" add constraint "messaging_conversations_shop_id_fkey" FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE not valid;

alter table "public"."messaging_conversations" validate constraint "messaging_conversations_shop_id_fkey";

alter table "public"."messaging_messages" add constraint "messaging_messages_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES public.messaging_conversations(id) ON DELETE CASCADE not valid;

alter table "public"."messaging_messages" validate constraint "messaging_messages_conversation_id_fkey";

alter table "public"."orders" add constraint "orders_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON UPDATE CASCADE ON DELETE SET NULL not valid;

alter table "public"."orders" validate constraint "orders_customer_id_fkey";

alter table "public"."orders" add constraint "orders_payment_method_id_fkey" FOREIGN KEY (payment_method_id) REFERENCES public.payment_methods(id) ON DELETE SET NULL not valid;

alter table "public"."orders" validate constraint "orders_payment_method_id_fkey";

alter table "public"."orders" add constraint "orders_shop_id_fkey" FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE not valid;

alter table "public"."orders" validate constraint "orders_shop_id_fkey";

alter table "public"."orders" add constraint "orders_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL not valid;

alter table "public"."orders" validate constraint "orders_user_id_fkey";

alter table "public"."payment_methods" add constraint "payment_methods_shop_id_fkey" FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE not valid;

alter table "public"."payment_methods" validate constraint "payment_methods_shop_id_fkey";

alter table "public"."product_categories" add constraint "product_categories_category_id_fkey" FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE not valid;

alter table "public"."product_categories" validate constraint "product_categories_category_id_fkey";

alter table "public"."product_categories" add constraint "product_categories_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE not valid;

alter table "public"."product_categories" validate constraint "product_categories_product_id_fkey";

alter table "public"."product_variations" add constraint "product_variations_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE not valid;

alter table "public"."product_variations" validate constraint "product_variations_product_id_fkey";

alter table "public"."products" add constraint "products_shop_id_fkey" FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE not valid;

alter table "public"."products" validate constraint "products_shop_id_fkey";

alter table "public"."shop_blogs" add constraint "shop_blogs_author_id_fkey" FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE SET NULL not valid;

alter table "public"."shop_blogs" validate constraint "shop_blogs_author_id_fkey";

alter table "public"."shop_blogs" add constraint "shop_blogs_shop_id_fkey" FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE not valid;

alter table "public"."shop_blogs" validate constraint "shop_blogs_shop_id_fkey";

alter table "public"."shops" add constraint "shops_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."shops" validate constraint "shops_owner_id_fkey";


  create policy "Give access to user"
  on "public"."inventory_logs"
  as permissive
  for all
  to authenticated
using ((inventory_id IN ( SELECT inventory.id
   FROM public.inventory
  WHERE (inventory.shop_id IN ( SELECT shops.id
           FROM public.shops
          WHERE (shops.owner_id = auth.uid()))))))
with check ((inventory_id IN ( SELECT inventory.id
   FROM public.inventory
  WHERE (inventory.shop_id IN ( SELECT shops.id
           FROM public.shops
          WHERE (shops.owner_id = auth.uid()))))));



  create policy "admin_all_attribute_items"
  on "public"."attribute_items"
  as permissive
  for all
  to public
using (public.is_admin());



  create policy "attr_items_delete"
  on "public"."attribute_items"
  as permissive
  for delete
  to public
using ((attribute_id IN ( SELECT a.id
   FROM (public.attributes a
     JOIN public.shops s ON ((s.id = a.shop_id)))
  WHERE (s.owner_id = auth.uid()))));



  create policy "attr_items_insert"
  on "public"."attribute_items"
  as permissive
  for insert
  to public
with check ((attribute_id IN ( SELECT a.id
   FROM (public.attributes a
     JOIN public.shops s ON ((s.id = a.shop_id)))
  WHERE (s.owner_id = auth.uid()))));



  create policy "attr_items_select"
  on "public"."attribute_items"
  as permissive
  for select
  to public
using ((attribute_id IN ( SELECT a.id
   FROM (public.attributes a
     JOIN public.shops s ON ((s.id = a.shop_id)))
  WHERE (s.owner_id = auth.uid()))));



  create policy "attr_items_update"
  on "public"."attribute_items"
  as permissive
  for update
  to public
using ((attribute_id IN ( SELECT a.id
   FROM (public.attributes a
     JOIN public.shops s ON ((s.id = a.shop_id)))
  WHERE (s.owner_id = auth.uid()))));



  create policy "admin_all_attributes"
  on "public"."attributes"
  as permissive
  for all
  to public
using (public.is_admin());



  create policy "attributes_delete"
  on "public"."attributes"
  as permissive
  for delete
  to public
using ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));



  create policy "attributes_insert"
  on "public"."attributes"
  as permissive
  for insert
  to public
with check ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));



  create policy "attributes_select"
  on "public"."attributes"
  as permissive
  for select
  to public
using ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));



  create policy "attributes_update"
  on "public"."attributes"
  as permissive
  for update
  to public
using ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));



  create policy "admin_all_billing_proofs"
  on "public"."billing_proofs"
  as permissive
  for all
  to public
using (public.is_admin());



  create policy "billing_proofs_insert_own"
  on "public"."billing_proofs"
  as permissive
  for insert
  to public
with check ((auth.uid() = ( SELECT shops.owner_id
   FROM public.shops
  WHERE (shops.id = billing_proofs.shop_id))));



  create policy "billing_proofs_select_own"
  on "public"."billing_proofs"
  as permissive
  for select
  to public
using ((auth.uid() = ( SELECT shops.owner_id
   FROM public.shops
  WHERE (shops.id = billing_proofs.shop_id))));



  create policy "admin_all_blog_comments"
  on "public"."blog_comments"
  as permissive
  for all
  to public
using (public.is_admin());



  create policy "admin_all_blog_likes"
  on "public"."blog_likes"
  as permissive
  for all
  to public
using (public.is_admin());



  create policy "admin_all_blog_shares"
  on "public"."blog_shares"
  as permissive
  for all
  to public
using (public.is_admin());



  create policy "admin_all_categories"
  on "public"."categories"
  as permissive
  for all
  to public
using (public.is_admin());



  create policy "categories_delete"
  on "public"."categories"
  as permissive
  for delete
  to public
using ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));



  create policy "categories_insert"
  on "public"."categories"
  as permissive
  for insert
  to public
with check ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));



  create policy "categories_select"
  on "public"."categories"
  as permissive
  for select
  to public
using (((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))) OR (shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.status = 'active'::text)))));



  create policy "categories_update"
  on "public"."categories"
  as permissive
  for update
  to public
using ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));



  create policy "admin_all_customer_activity"
  on "public"."customer_activity"
  as permissive
  for all
  to public
using (public.is_admin());



  create policy "customer_activity_select_policy"
  on "public"."customer_activity"
  as permissive
  for select
  to public
using ((customer_id IN ( SELECT customers.id
   FROM public.customers
  WHERE (customers.shop_id IN ( SELECT shops.id
           FROM public.shops
          WHERE (shops.owner_id = auth.uid()))))));



  create policy "vendors_read_own_shop_customer_identities"
  on "public"."customer_identities"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM (public.customers c
     JOIN public.shops s ON ((s.id = c.shop_id)))
  WHERE ((c.id = customer_identities.customer_id) AND (s.owner_id = auth.uid())))));



  create policy "admin_all_customers"
  on "public"."customers"
  as permissive
  for all
  to public
using (public.is_admin());



  create policy "customers_select_policy"
  on "public"."customers"
  as permissive
  for select
  to public
using ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));



  create policy "customers_update_policy"
  on "public"."customers"
  as permissive
  for update
  to public
using ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));



  create policy "admin_all_inventory"
  on "public"."inventory"
  as permissive
  for all
  to public
using (public.is_admin());



  create policy "inventory_insert_policy"
  on "public"."inventory"
  as permissive
  for insert
  to public
with check ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));



  create policy "inventory_select_policy"
  on "public"."inventory"
  as permissive
  for select
  to public
using ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));



  create policy "inventory_update_policy"
  on "public"."inventory"
  as permissive
  for update
  to public
using ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));



  create policy "admin_all_inventory_logs"
  on "public"."inventory_logs"
  as permissive
  for all
  to public
using (public.is_admin());



  create policy "inventory_logs_select_policy"
  on "public"."inventory_logs"
  as permissive
  for select
  to public
using ((inventory_id IN ( SELECT inventory.id
   FROM public.inventory
  WHERE (inventory.shop_id IN ( SELECT shops.id
           FROM public.shops
          WHERE (shops.owner_id = auth.uid()))))));



  create policy "vendors_manage_own_messaging_channels"
  on "public"."messaging_channels"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM public.shops
  WHERE ((shops.id = messaging_channels.shop_id) AND (shops.owner_id = auth.uid())))));



  create policy "vendors_manage_own_conversations"
  on "public"."messaging_conversations"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM public.shops
  WHERE ((shops.id = messaging_conversations.shop_id) AND (shops.owner_id = auth.uid())))));



  create policy "vendors_manage_own_messages"
  on "public"."messaging_messages"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM (public.messaging_conversations conv
     JOIN public.shops s ON ((s.id = conv.shop_id)))
  WHERE ((conv.id = messaging_messages.conversation_id) AND (s.owner_id = auth.uid())))));



  create policy "admin_all_orders"
  on "public"."orders"
  as permissive
  for all
  to public
using (public.is_admin());



  create policy "admin_all_payment_methods"
  on "public"."payment_methods"
  as permissive
  for all
  to public
using (public.is_admin());



  create policy "payment_methods_delete_own"
  on "public"."payment_methods"
  as permissive
  for delete
  to public
using ((auth.uid() = ( SELECT shops.owner_id
   FROM public.shops
  WHERE (shops.id = payment_methods.shop_id))));



  create policy "payment_methods_insert_own"
  on "public"."payment_methods"
  as permissive
  for insert
  to public
with check ((auth.uid() = ( SELECT shops.owner_id
   FROM public.shops
  WHERE (shops.id = payment_methods.shop_id))));



  create policy "payment_methods_select_own"
  on "public"."payment_methods"
  as permissive
  for select
  to public
using ((auth.uid() = ( SELECT shops.owner_id
   FROM public.shops
  WHERE (shops.id = payment_methods.shop_id))));



  create policy "payment_methods_update_own"
  on "public"."payment_methods"
  as permissive
  for update
  to public
using ((auth.uid() = ( SELECT shops.owner_id
   FROM public.shops
  WHERE (shops.id = payment_methods.shop_id))));



  create policy "admin_all_product_categories"
  on "public"."product_categories"
  as permissive
  for all
  to public
using (public.is_admin());



  create policy "product_cats_delete"
  on "public"."product_categories"
  as permissive
  for delete
  to public
using ((product_id IN ( SELECT p.id
   FROM (public.products p
     JOIN public.shops s ON ((s.id = p.shop_id)))
  WHERE (s.owner_id = auth.uid()))));



  create policy "product_cats_insert"
  on "public"."product_categories"
  as permissive
  for insert
  to public
with check ((product_id IN ( SELECT p.id
   FROM (public.products p
     JOIN public.shops s ON ((s.id = p.shop_id)))
  WHERE (s.owner_id = auth.uid()))));



  create policy "product_cats_select"
  on "public"."product_categories"
  as permissive
  for select
  to public
using ((product_id IN ( SELECT p.id
   FROM (public.products p
     JOIN public.shops s ON ((s.id = p.shop_id)))
  WHERE ((s.owner_id = auth.uid()) OR (p.is_active = true)))));



  create policy "admin_all_product_variations"
  on "public"."product_variations"
  as permissive
  for all
  to public
using (public.is_admin());



  create policy "product_vars_delete"
  on "public"."product_variations"
  as permissive
  for delete
  to public
using ((product_id IN ( SELECT p.id
   FROM (public.products p
     JOIN public.shops s ON ((s.id = p.shop_id)))
  WHERE (s.owner_id = auth.uid()))));



  create policy "product_vars_insert"
  on "public"."product_variations"
  as permissive
  for insert
  to public
with check ((product_id IN ( SELECT p.id
   FROM (public.products p
     JOIN public.shops s ON ((s.id = p.shop_id)))
  WHERE (s.owner_id = auth.uid()))));



  create policy "product_vars_select"
  on "public"."product_variations"
  as permissive
  for select
  to public
using ((product_id IN ( SELECT p.id
   FROM (public.products p
     JOIN public.shops s ON ((s.id = p.shop_id)))
  WHERE ((s.owner_id = auth.uid()) OR (p.is_active = true)))));



  create policy "product_vars_update"
  on "public"."product_variations"
  as permissive
  for update
  to public
using ((product_id IN ( SELECT p.id
   FROM (public.products p
     JOIN public.shops s ON ((s.id = p.shop_id)))
  WHERE (s.owner_id = auth.uid()))));



  create policy "admin_all_products"
  on "public"."products"
  as permissive
  for all
  to public
using (public.is_admin());



  create policy "products_delete_own"
  on "public"."products"
  as permissive
  for delete
  to public
using ((auth.uid() = ( SELECT shops.owner_id
   FROM public.shops
  WHERE (shops.id = products.shop_id))));



  create policy "products_insert_own"
  on "public"."products"
  as permissive
  for insert
  to public
with check ((auth.uid() = ( SELECT shops.owner_id
   FROM public.shops
  WHERE (shops.id = products.shop_id))));



  create policy "products_select_active"
  on "public"."products"
  as permissive
  for select
  to public
using (((is_active = true) OR (auth.uid() = ( SELECT shops.owner_id
   FROM public.shops
  WHERE (shops.id = products.shop_id)))));



  create policy "products_update_own"
  on "public"."products"
  as permissive
  for update
  to public
using ((auth.uid() = ( SELECT shops.owner_id
   FROM public.shops
  WHERE (shops.id = products.shop_id))));



  create policy "admin_all_shop_blogs"
  on "public"."shop_blogs"
  as permissive
  for all
  to public
using (public.is_admin());



  create policy "vendor delete blogs"
  on "public"."shop_blogs"
  as permissive
  for delete
  to public
using ((auth.uid() IN ( SELECT shops.owner_id
   FROM public.shops
  WHERE (shops.id = shop_blogs.shop_id))));



  create policy "vendor insert blogs"
  on "public"."shop_blogs"
  as permissive
  for insert
  to public
with check ((auth.uid() IN ( SELECT shops.owner_id
   FROM public.shops
  WHERE (shops.id = shop_blogs.shop_id))));



  create policy "vendor read own shop blogs"
  on "public"."shop_blogs"
  as permissive
  for select
  to public
using ((auth.uid() IN ( SELECT shops.owner_id
   FROM public.shops
  WHERE (shops.id = shop_blogs.shop_id))));



  create policy "vendor update blogs"
  on "public"."shop_blogs"
  as permissive
  for update
  to public
using ((auth.uid() IN ( SELECT shops.owner_id
   FROM public.shops
  WHERE (shops.id = shop_blogs.shop_id))));



  create policy "admin_all_shops"
  on "public"."shops"
  as permissive
  for all
  to public
using (public.is_admin());


CREATE TRIGGER set_billing_proofs_updated_at BEFORE UPDATE ON public.billing_proofs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER customer_update_timestamp BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.trigger_customer_update_timestamp();

CREATE TRIGGER inventory_update_timestamp BEFORE UPDATE ON public.inventory FOR EACH ROW EXECUTE FUNCTION public.trigger_inventory_update_timestamp();

CREATE TRIGGER sync_inventory_to_variation_trigger AFTER UPDATE ON public.inventory FOR EACH ROW EXECUTE FUNCTION public.sync_inventory_to_variation();

CREATE TRIGGER trg_update_conversation_on_message_insert AFTER INSERT ON public.messaging_messages FOR EACH ROW EXECUTE FUNCTION public.update_conversation_on_message_insert();

CREATE TRIGGER deduct_inventory_on_order_confirmed AFTER UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.deduct_inventory_on_confirmation();

CREATE TRIGGER restore_inventory_on_order_cancelled AFTER UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.restore_inventory_on_cancel();

CREATE TRIGGER set_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_adjust_customer_stats_on_order_cancel AFTER UPDATE OF status ON public.orders FOR EACH ROW EXECUTE FUNCTION public.adjust_customer_stats_on_order_cancel();

CREATE TRIGGER trg_update_customer_stats_on_order_insert AFTER INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_customer_stats_on_order_insert();

CREATE TRIGGER set_payment_methods_updated_at BEFORE UPDATE ON public.payment_methods FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER auto_create_inventory_on_variation AFTER INSERT ON public.product_variations FOR EACH ROW EXECUTE FUNCTION public.create_inventory_on_variation_insert();

CREATE TRIGGER set_product_variations_updated_at BEFORE UPDATE ON public.product_variations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER auto_create_inventory AFTER INSERT ON public.products FOR EACH ROW EXECUTE FUNCTION public.create_inventory_on_product_insert();

CREATE TRIGGER set_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER shop_blogs_updated_at BEFORE UPDATE ON public.shop_blogs FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER create_default_cash_on_shops AFTER INSERT ON public.shops FOR EACH ROW EXECUTE FUNCTION public.create_default_cash_payment();

CREATE TRIGGER set_shops_updated_at BEFORE UPDATE ON public.shops FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

drop trigger if exists "on_auth_user_created" on "auth"."users";

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

drop policy "payment_proofs_any_upload" on "storage"."objects";

drop policy "payment_proofs_auth_read" on "storage"."objects";

drop policy "product_images_auth_upload" on "storage"."objects";


  create policy "Allow users bjsgsj_0"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'blog-images'::text));



  create policy "Allow users bjsgsj_1"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check ((bucket_id = 'blog-images'::text));



  create policy "Allow users bjsgsj_2"
  on "storage"."objects"
  as permissive
  for update
  to public
using ((bucket_id = 'blog-images'::text));



  create policy "Allow users bjsgsj_3"
  on "storage"."objects"
  as permissive
  for delete
  to public
using ((bucket_id = 'blog-images'::text));



  create policy "Allow users to insert 16wiy3a_0"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check ((bucket_id = 'product-images'::text));



  create policy "Allow users w1pnpy_0"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'payment-proofs'::text));



  create policy "Allow users w1pnpy_1"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check ((bucket_id = 'payment-proofs'::text));



  create policy "Allow users w1pnpy_2"
  on "storage"."objects"
  as permissive
  for update
  to public
using ((bucket_id = 'payment-proofs'::text));



  create policy "Allow users w1pnpy_3"
  on "storage"."objects"
  as permissive
  for delete
  to public
using ((bucket_id = 'payment-proofs'::text));



