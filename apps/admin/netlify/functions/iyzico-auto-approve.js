// Netlify Scheduled Function: iyzico otomatik onay
// Ödeme tarihinden 30 gün geçmiş, onaylanmamış order_item'ları approve eder.
// Cron: her 6 saatte bir (UTC). 03:00, 09:00, 15:00, 21:00 Istanbul.

exports.handler = async () => {
  const baseUrl = process.env.URL || process.env.DEPLOY_PRIME_URL;
  const secret = process.env.IYZICO_CRON_SECRET;

  if (!baseUrl) return { statusCode: 500, body: 'Missing URL/DEPLOY_PRIME_URL' };
  if (!secret) return { statusCode: 500, body: 'Missing IYZICO_CRON_SECRET' };

  const res = await fetch(`${baseUrl}/api/iyzico/auto-approve`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${secret}`,
      'content-type': 'application/json',
    },
  });

  const text = await res.text();
  return {
    statusCode: res.status,
    body: text,
    headers: { 'content-type': res.headers.get('content-type') || 'application/json' },
  };
};

// 00:00, 06:00, 12:00, 18:00 UTC = 03:00, 09:00, 15:00, 21:00 Istanbul
exports.config = {
  schedule: '0 */6 * * *',
};
