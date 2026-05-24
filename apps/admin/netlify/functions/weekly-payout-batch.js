// Netlify Scheduled Function: Weekly payout batch (Wednesday)
// Runs on a cron schedule and triggers the Next.js API route.
// Note: Netlify cron is in UTC. Istanbul is UTC+3 (no DST).

exports.handler = async () => {
  const baseUrl = process.env.URL || process.env.DEPLOY_PRIME_URL;
  const secret = process.env.PAYOUT_BATCH_SECRET;

  if (!baseUrl) {
    return { statusCode: 500, body: 'Missing URL/DEPLOY_PRIME_URL' };
  }
  if (!secret) {
    return { statusCode: 500, body: 'Missing PAYOUT_BATCH_SECRET' };
  }

  const res = await fetch(`${baseUrl}/api/payout-batch/run-weekly`, {
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

// 06:00 UTC = 09:00 Europe/Istanbul
exports.config = {
  schedule: '0 6 * * 3',
};
