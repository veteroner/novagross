-- is_order_seller: sipariş satıcı-görünürlüğü (orders SELECT policy + order_items
-- embed'leri buna bağlı) owner_id ile join yapıyordu → yönetici/personel siparişi
-- göremiyordu (orders!inner embed satırı eliyordu, sipariş listesi 0 dönüyordu).
-- is_store_member'a çevrildi.
CREATE OR REPLACE FUNCTION public.is_order_seller(p_order_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.order_items oi
    WHERE oi.order_id = p_order_id AND public.is_store_member(oi.store_id, 'staff')
  );
$$;
