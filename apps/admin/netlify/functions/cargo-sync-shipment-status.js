// Netlify Scheduled Function: MNG Bulk Query ile kargo durum senkronizasyonu
// Durumu değişen tüm gönderileri çeker, order_shipments/orders'ı günceller.
// Cron: her 3 saatte bir.

exports.handler = async () => {
  const baseUrl = process.env.URL || process.env.DEPLOY_PRIME_URL;
  const secret = process.env.MNG_CRON_SECRET;

  if (!baseUrl) return { statusCode: 500, body: 'Missing URL/DEPLOY_PRIME_URL' };
  if (!secret) return { statusCode: 500, body: 'Missing MNG_CRON_SECRET' };

  const res = await fetch(`${baseUrl}/api/cargo/sync-shipment-status`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${secret}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ hoursBack: 4 }),
  });

  const text = await res.text();
  return {
    statusCode: res.status,
    body: text,
    headers: { 'content-type': res.headers.get('content-type') || 'application/json' },
  };
};

exports.config = {
  schedule: '0 */3 * * *',
};
