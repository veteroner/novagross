// Netlify Scheduled Function: process email queue
// Keeps async email delivery running without manual calls.

exports.handler = async () => {
  const baseUrl = process.env.URL || process.env.DEPLOY_PRIME_URL;
  const secret = process.env.EMAIL_QUEUE_PROCESSOR_SECRET;

  if (!baseUrl) {
    return { statusCode: 500, body: 'Missing URL/DEPLOY_PRIME_URL' };
  }

  const headers = {
    'content-type': 'application/json',
  };

  // If secret isn't set, the API route allows (dev/local). In prod, you should set it.
  if (secret) {
    headers.authorization = `Bearer ${secret}`;
  }

  const res = await fetch(`${baseUrl}/api/email/process-queue?limit=20`, {
    method: 'POST',
    headers,
  });

  const text = await res.text();
  return {
    statusCode: res.status,
    body: text,
    headers: { 'content-type': res.headers.get('content-type') || 'application/json' },
  };
};

exports.config = {
  // every 5 minutes
  schedule: '*/5 * * * *',
};
