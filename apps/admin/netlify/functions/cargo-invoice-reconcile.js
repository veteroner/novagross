// Netlify Scheduled Function: MNG kargo faturası mutabakatı
// MNG faturalarından gerçek kargo ücretini çekip satıcı hak edişinden düşer.
// Cron: her gün 02:00 UTC (05:00 Istanbul).

exports.handler = async () => {
  const baseUrl = process.env.URL || process.env.DEPLOY_PRIME_URL;
  const secret = process.env.MNG_CRON_SECRET;

  if (!baseUrl) return { statusCode: 500, body: 'Missing URL/DEPLOY_PRIME_URL' };
  if (!secret) return { statusCode: 500, body: 'Missing MNG_CRON_SECRET' };

  const res = await fetch(`${baseUrl}/api/cargo/reconcile-invoices`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${secret}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ days: 35 }),
  });

  const text = await res.text();
  return {
    statusCode: res.status,
    body: text,
    headers: { 'content-type': res.headers.get('content-type') || 'application/json' },
  };
};

exports.config = {
  schedule: '0 2 * * *',
};
