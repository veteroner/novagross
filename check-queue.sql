-- Check email_queue for these two orders
SELECT 
  id,
  recipient,
  template,
  subject,
  priority,
  status,
  created_at,
  data->>'orderNumber' as order_number
FROM email_queue
WHERE 
  data->>'orderNumber' IN ('2678557379', '2606476999')
  OR subject LIKE '%2678557379%'
  OR subject LIKE '%2606476999%'
ORDER BY created_at DESC
LIMIT 20;
