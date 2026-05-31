-- "Çok satan" rozeti için view — son 30 gün satış adedlerine göre sıralı ürünler
CREATE OR REPLACE VIEW popular_products AS
SELECT
  oi.product_id,
  COUNT(DISTINCT oi.order_id)  AS order_count,
  SUM(oi.quantity)             AS total_sold,
  ROW_NUMBER() OVER (ORDER BY SUM(oi.quantity) DESC NULLS LAST) AS rank
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
WHERE oi.created_at > NOW() - INTERVAL '30 days'
  AND COALESCE(o.status, '') NOT IN ('cancelled', 'refunded')
  AND oi.product_id IS NOT NULL
GROUP BY oi.product_id;

COMMENT ON VIEW popular_products IS
  'Last 30d sold quantities per product, ranked. Powers "Çok satan" badges.';
