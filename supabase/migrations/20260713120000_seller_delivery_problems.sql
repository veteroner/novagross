-- Satıcılar artık kendi siparişlerine ait teslimat sorunlarını görebilir ve
-- yanıtlayabilir (önceden yalnızca admin görebiliyordu). Kurye/şube sorunu
-- bildirdiğinde en hızlı çözüm siparişin sahibi satıcıdan gelir; admin
-- yalnızca genel görünürlük için tüm kayıtları görmeye devam eder.

DROP POLICY IF EXISTS "Sellers view own delivery problems" ON public.delivery_problems;
CREATE POLICY "Sellers view own delivery problems" ON public.delivery_problems
  FOR SELECT USING (
    order_id IN (
      SELECT oi.order_id
      FROM public.order_items oi
      JOIN public.stores s ON s.id = oi.store_id
      WHERE s.owner_id = auth.uid()
    )
  );
