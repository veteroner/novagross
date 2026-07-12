// Netlify Scheduled Function: haftalık satıcı içgörü raporu
// Her Pazartesi 06:00 UTC (09:00 Istanbul) — mağazalara haftalık rapor e-postası.

exports.handler = async () => {
  const baseUrl = process.env.URL || process.env.DEPLOY_PRIME_URL;
  const secret = process.env.MARKETING_CRON_SECRET;

  if (!baseUrl) return { statusCode: 500, body: 'Missing URL/DEPLOY_PRIME_URL' };
  if (!secret) return { statusCode: 500, body: 'Missing MARKETING_CRON_SECRET' };

  const res = await fetch(`${baseUrl}/api/marketing/weekly-seller-insights`, {
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
  schedule: '0 6 * * 1',
};
