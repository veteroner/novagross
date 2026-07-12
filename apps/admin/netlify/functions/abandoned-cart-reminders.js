// Netlify Scheduled Function: terk edilmiş sepet hatırlatmaları
// Her gün 08:00 UTC (11:00 Istanbul) — 24 saatten eski sepetlere e-posta + bildirim.

exports.handler = async () => {
  const baseUrl = process.env.URL || process.env.DEPLOY_PRIME_URL;
  const secret = process.env.MARKETING_CRON_SECRET;

  if (!baseUrl) return { statusCode: 500, body: 'Missing URL/DEPLOY_PRIME_URL' };
  if (!secret) return { statusCode: 500, body: 'Missing MARKETING_CRON_SECRET' };

  const res = await fetch(`${baseUrl}/api/marketing/abandoned-cart-reminders`, {
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

exports.config = {
  schedule: '0 8 * * *',
};
