-- ====================================================================
-- Çok Kullanıcılı Mağaza — RLS'i rol-duyarlı hale getir
--
-- Store-scoped satıcı politikalarını owner_id/owns_store'dan
-- is_store_member(store_id, <seviye>)'e çevirir. Seviyeler:
--   staff+   : operasyon (sipariş, ürün, kargo, fatura, müşteri Q&A)
--   manager+ : pazarlama + finans görme + para çekme
--   owner    : banka/IBAN (stores UPDATE) — DEĞİŞMEDEN owner_id kalır
--
-- owns_store() ve stores UPDATE policy'si BİLİNÇLİ olarak değiştirilmedi:
-- banka kolonları + mağaza çekirdek kaydı Sahip'e özel kalır.
-- ====================================================================

-- ============ STAFF+ (OPERASYON) ============

-- stores SELECT: üyeler mağazayı okuyabilmeli (banka/vergi kolonları
-- zaten authenticated'a GRANT edilmemiş — sadece owner RPC ile okunur)
DROP POLICY IF EXISTS "Sellers can view own store" ON stores;
CREATE POLICY "Sellers can view own store" ON stores FOR SELECT
  USING (public.is_store_member(id, 'staff'));

-- products
DROP POLICY IF EXISTS "Sellers can view own products" ON products;
CREATE POLICY "Sellers can view own products" ON products FOR SELECT
  USING (public.is_store_member(store_id, 'staff'));
DROP POLICY IF EXISTS "Sellers can insert products" ON products;
CREATE POLICY "Sellers can insert products" ON products FOR INSERT
  WITH CHECK (public.is_store_member(store_id, 'staff'));
DROP POLICY IF EXISTS "Sellers can update own products" ON products;
CREATE POLICY "Sellers can update own products" ON products FOR UPDATE
  USING (public.is_store_member(store_id, 'staff'))
  WITH CHECK (public.is_store_member(store_id, 'staff'));

-- product_images / product_variants (products üzerinden)
DROP POLICY IF EXISTS "Sellers can manage own product images" ON product_images;
CREATE POLICY "Sellers can manage own product images" ON product_images FOR ALL
  USING (EXISTS (SELECT 1 FROM products p WHERE p.id = product_images.product_id AND public.is_store_member(p.store_id, 'staff')));
DROP POLICY IF EXISTS "Sellers can manage own variants" ON product_variants;
CREATE POLICY "Sellers can manage own variants" ON product_variants FOR ALL
  USING (EXISTS (SELECT 1 FROM products p WHERE p.id = product_variants.product_id AND public.is_store_member(p.store_id, 'staff')));
DROP POLICY IF EXISTS "Sellers can view own variants" ON product_variants;
CREATE POLICY "Sellers can view own variants" ON product_variants FOR SELECT
  USING (EXISTS (SELECT 1 FROM products p WHERE p.id = product_variants.product_id AND public.is_store_member(p.store_id, 'staff')));

-- order_items
DROP POLICY IF EXISTS "Sellers can view their order items" ON order_items;
CREATE POLICY "Sellers can view their order items" ON order_items FOR SELECT
  USING (public.is_store_member(store_id, 'staff'));

-- order_shipments (seller ALL + birleşik SELECT — alıcı/satıcı/admin)
DROP POLICY IF EXISTS "Sellers can create/update shipments for own orders" ON order_shipments;
CREATE POLICY "Sellers can create/update shipments for own orders" ON order_shipments FOR ALL
  USING (
    (order_id IN (
      SELECT o.id FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      WHERE public.is_store_member(oi.store_id, 'staff')
    )) OR public.is_admin()
  );
DROP POLICY IF EXISTS "Users can view own order shipments" ON order_shipments;
CREATE POLICY "Users can view own order shipments" ON order_shipments FOR SELECT
  USING (
    (order_id IN (SELECT orders.id FROM orders WHERE orders.user_id = auth.uid()))
    OR (order_id IN (
      SELECT o.id FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      WHERE public.is_store_member(oi.store_id, 'staff')
    ))
    OR public.is_admin()
  );

-- order_invoices (with_check'te sipariş-kalem kontrolü korunur)
DROP POLICY IF EXISTS "Seller manages own order invoices" ON order_invoices;
CREATE POLICY "Seller manages own order invoices" ON order_invoices FOR ALL
  USING (public.is_store_member(store_id, 'staff'))
  WITH CHECK (
    public.is_store_member(store_id, 'staff')
    AND EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = order_invoices.order_id AND oi.store_id = order_invoices.store_id)
  );

-- product_questions
DROP POLICY IF EXISTS "Seller views questions on own products" ON product_questions;
CREATE POLICY "Seller views questions on own products" ON product_questions FOR SELECT
  USING (EXISTS (SELECT 1 FROM products p WHERE p.id = product_questions.product_id AND public.is_store_member(p.store_id, 'staff')));
DROP POLICY IF EXISTS "Seller can answer own products questions" ON product_questions;
CREATE POLICY "Seller can answer own products questions" ON product_questions FOR UPDATE
  USING (EXISTS (SELECT 1 FROM products p WHERE p.id = product_questions.product_id AND public.is_store_member(p.store_id, 'staff')))
  WITH CHECK (EXISTS (SELECT 1 FROM products p WHERE p.id = product_questions.product_id AND public.is_store_member(p.store_id, 'staff')));

-- store_reviews
DROP POLICY IF EXISTS "Sellers can view their store reviews" ON store_reviews;
CREATE POLICY "Sellers can view their store reviews" ON store_reviews FOR SELECT
  USING (public.is_store_member(store_id, 'staff'));
DROP POLICY IF EXISTS "Sellers can reply to own store reviews" ON store_reviews;
CREATE POLICY "Sellers can reply to own store reviews" ON store_reviews FOR UPDATE
  USING (public.is_store_member(store_id, 'staff'))
  WITH CHECK (public.is_store_member(store_id, 'staff'));

-- return_requests
DROP POLICY IF EXISTS "Sellers can view their store return requests" ON return_requests;
CREATE POLICY "Sellers can view their store return requests" ON return_requests FOR SELECT
  USING (public.is_store_member(store_id, 'staff'));

-- delivery_problems (order_items üzerinden)
DROP POLICY IF EXISTS "Sellers view own delivery problems" ON delivery_problems;
CREATE POLICY "Sellers view own delivery problems" ON delivery_problems FOR SELECT
  USING (order_id IN (SELECT oi.order_id FROM order_items oi WHERE public.is_store_member(oi.store_id, 'staff')));

-- store_documents
DROP POLICY IF EXISTS "Seller views own documents" ON store_documents;
CREATE POLICY "Seller views own documents" ON store_documents FOR SELECT
  USING (public.is_store_member(store_id, 'staff'));
DROP POLICY IF EXISTS "Seller uploads own documents" ON store_documents;
CREATE POLICY "Seller uploads own documents" ON store_documents FOR INSERT
  WITH CHECK (public.is_store_member(store_id, 'staff'));
DROP POLICY IF EXISTS "Seller updates own pending documents" ON store_documents;
CREATE POLICY "Seller updates own pending documents" ON store_documents FOR UPDATE
  USING (status = 'pending' AND public.is_store_member(store_id, 'staff'))
  WITH CHECK (public.is_store_member(store_id, 'staff'));

-- store_storefront (vitrin)
DROP POLICY IF EXISTS "Seller manages own storefront" ON store_storefront;
CREATE POLICY "Seller manages own storefront" ON store_storefront FOR ALL
  USING (public.is_store_member(store_id, 'staff'))
  WITH CHECK (public.is_store_member(store_id, 'staff'));

-- ============ MANAGER+ (PAZARLAMA + FİNANS GÖRME + PARA ÇEKME) ============

-- store_campaigns
DROP POLICY IF EXISTS "Seller manages own campaigns" ON store_campaigns;
CREATE POLICY "Seller manages own campaigns" ON store_campaigns FOR ALL
  USING (public.is_store_member(store_id, 'manager'))
  WITH CHECK (public.is_store_member(store_id, 'manager'));

-- ad_campaigns / ad_events
DROP POLICY IF EXISTS "Seller manages own ad campaigns" ON ad_campaigns;
CREATE POLICY "Seller manages own ad campaigns" ON ad_campaigns FOR ALL
  USING (public.is_store_member(store_id, 'manager'))
  WITH CHECK (public.is_store_member(store_id, 'manager'));
DROP POLICY IF EXISTS "Seller reads own ad events" ON ad_events;
CREATE POLICY "Seller reads own ad events" ON ad_events FOR SELECT
  USING (EXISTS (SELECT 1 FROM ad_campaigns c WHERE c.id = ad_events.campaign_id AND public.is_store_member(c.store_id, 'manager')));

-- platform_offers (global store_id IS NULL herkese açık kalır)
DROP POLICY IF EXISTS "Seller reads own/global offers" ON platform_offers;
CREATE POLICY "Seller reads own/global offers" ON platform_offers FOR SELECT
  USING (store_id IS NULL OR public.is_store_member(store_id, 'manager'));
DROP POLICY IF EXISTS "Seller responds to own offers" ON platform_offers;
CREATE POLICY "Seller responds to own offers" ON platform_offers FOR UPDATE
  USING (public.is_store_member(store_id, 'manager') AND status = 'pending')
  WITH CHECK (public.is_store_member(store_id, 'manager'));

-- commission_invoices (issued kalır)
DROP POLICY IF EXISTS "Seller views own issued invoices" ON commission_invoices;
CREATE POLICY "Seller views own issued invoices" ON commission_invoices FOR SELECT
  USING (status = 'issued' AND public.is_store_member(store_id, 'manager'));

-- withholding_receipts
DROP POLICY IF EXISTS "Seller views own receipts" ON withholding_receipts;
CREATE POLICY "Seller views own receipts" ON withholding_receipts FOR SELECT
  USING (public.is_store_member(store_id, 'manager'));

-- withdrawal_requests (para çekme: Yönetici+; banka kolonları snapshot,
-- destinasyonu değiştirmek stores UPDATE'e bağlı = owner-only)
DROP POLICY IF EXISTS "Sellers can view own withdrawal requests" ON withdrawal_requests;
CREATE POLICY "Sellers can view own withdrawal requests" ON withdrawal_requests FOR SELECT
  USING (public.is_store_member(store_id, 'manager'));
DROP POLICY IF EXISTS "Sellers can create withdrawal requests" ON withdrawal_requests;
CREATE POLICY "Sellers can create withdrawal requests" ON withdrawal_requests FOR INSERT
  WITH CHECK (public.is_store_member(store_id, 'manager'));

-- NOT: stores UPDATE ("Sellers can update own store (except admin fields)")
-- ve owns_store() BİLİNÇLİ OLARAK DEĞİŞTİRİLMEDİ — banka/IBAN + çekirdek
-- mağaza kaydı yalnızca Sahip (owner_id) tarafından değiştirilebilir.
