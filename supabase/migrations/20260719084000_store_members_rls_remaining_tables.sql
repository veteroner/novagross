-- İlk RLS migration'ında (20260718110001) atlanan satıcı tabloları:
-- owner_id → is_store_member. Operasyon = staff+, finans/pazarlama = manager+.
-- Belirti: yönetici/personel müşteri talepleri, kargo geçmişi, teslimat ayarları,
-- bakiye/işlemler ve pazarlama tablolarını göremiyordu.

-- ===== STAFF+ (OPERASYON) =====

DROP POLICY IF EXISTS "Seller views own store claims" ON customer_claims;
CREATE POLICY "Seller views own store claims" ON customer_claims FOR SELECT
  USING (public.is_store_member(store_id, 'staff'));
DROP POLICY IF EXISTS "Seller manages own store claims" ON customer_claims;
CREATE POLICY "Seller manages own store claims" ON customer_claims FOR UPDATE
  USING (public.is_store_member(store_id, 'staff'))
  WITH CHECK (public.is_store_member(store_id, 'staff'));

DROP POLICY IF EXISTS "Sellers can reply to reviews on own products" ON reviews;
CREATE POLICY "Sellers can reply to reviews on own products" ON reviews FOR UPDATE
  USING (EXISTS (SELECT 1 FROM products p WHERE p.id = reviews.product_id AND public.is_store_member(p.store_id, 'staff')))
  WITH CHECK (EXISTS (SELECT 1 FROM products p WHERE p.id = reviews.product_id AND public.is_store_member(p.store_id, 'staff')));

DROP POLICY IF EXISTS "Users can view shipment history" ON shipping_status_history;
CREATE POLICY "Users can view shipment history" ON shipping_status_history FOR SELECT
  USING (
    shipment_id IN (
      SELECT os.id FROM order_shipments os
      WHERE os.order_id IN (SELECT orders.id FROM orders WHERE orders.user_id = auth.uid())
         OR os.order_id IN (SELECT oi.order_id FROM order_items oi WHERE public.is_store_member(oi.store_id, 'staff'))
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Seller manages own shipping settings" ON store_shipping_settings;
CREATE POLICY "Seller manages own shipping settings" ON store_shipping_settings FOR ALL
  USING (public.is_store_member(store_id, 'staff'))
  WITH CHECK (public.is_store_member(store_id, 'staff'));
DROP POLICY IF EXISTS "Store owners can manage own settings" ON store_shipping_settings;
CREATE POLICY "Store owners can manage own settings" ON store_shipping_settings FOR ALL
  USING (public.is_store_member(store_id, 'staff') OR public.is_admin());
DROP POLICY IF EXISTS "Store owners can view own settings" ON store_shipping_settings;
CREATE POLICY "Store owners can view own settings" ON store_shipping_settings FOR SELECT
  USING (public.is_store_member(store_id, 'staff') OR public.is_admin());

-- ===== MANAGER+ (FİNANS + PAZARLAMA) =====

DROP POLICY IF EXISTS "Sellers can view own balance" ON store_balance;
CREATE POLICY "Sellers can view own balance" ON store_balance FOR SELECT
  USING (public.is_store_member(store_id, 'manager'));
DROP POLICY IF EXISTS "Sellers can view own transactions" ON store_transactions;
CREATE POLICY "Sellers can view own transactions" ON store_transactions FOR SELECT
  USING (public.is_store_member(store_id, 'manager'));

DROP POLICY IF EXISTS "seller reads own topups" ON ad_balance_topups;
CREATE POLICY "seller reads own topups" ON ad_balance_topups FOR SELECT
  USING (public.is_store_member(store_id, 'manager'));
DROP POLICY IF EXISTS "seller reads own ad tx" ON ad_balance_transactions;
CREATE POLICY "seller reads own ad tx" ON ad_balance_transactions FOR SELECT
  USING (public.is_store_member(store_id, 'manager'));

DROP POLICY IF EXISTS "seller reads own campaign products" ON commission_campaign_products;
CREATE POLICY "seller reads own campaign products" ON commission_campaign_products FOR SELECT
  USING (public.is_store_member(store_id, 'manager'));
DROP POLICY IF EXISTS "seller inserts own campaign products" ON commission_campaign_products;
CREATE POLICY "seller inserts own campaign products" ON commission_campaign_products FOR INSERT
  WITH CHECK (public.is_store_member(store_id, 'manager'));
DROP POLICY IF EXISTS "seller deletes own campaign products" ON commission_campaign_products;
CREATE POLICY "seller deletes own campaign products" ON commission_campaign_products FOR DELETE
  USING (public.is_store_member(store_id, 'manager'));

DROP POLICY IF EXISTS "Store owner reads own offers" ON product_offers;
CREATE POLICY "Store owner reads own offers" ON product_offers FOR SELECT
  USING (public.is_store_member(store_id, 'manager'));

DROP POLICY IF EXISTS "seller reads own gift coupons" ON seller_gift_coupons;
CREATE POLICY "seller reads own gift coupons" ON seller_gift_coupons FOR SELECT
  USING (public.is_store_member(store_id, 'manager'));
