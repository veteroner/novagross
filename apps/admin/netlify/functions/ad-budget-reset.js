// Her gün gece yarısı (TR saati 00:05 = UTC 21:05) bütçe dolduğu için
// duran kampanyaları yeniden aktif eder (status='approved' AND is_active=false).
// Manuel durdurulanlar (status='paused') etkilenmez.

exports.handler = async () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return { statusCode: 500, body: 'Missing Supabase env vars' }
  }

  const res = await fetch(
    `${supabaseUrl}/rest/v1/ad_campaigns?status=eq.approved&is_active=eq.false`,
    {
      method: 'PATCH',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({ is_active: true }),
    }
  )

  const data = await res.json().catch(() => [])
  const count = Array.isArray(data) ? data.length : 0

  console.log(`[ad-budget-reset] Reactivated ${count} campaigns`)
  return { statusCode: 200, body: JSON.stringify({ reactivated: count }) }
}

exports.config = { schedule: '5 21 * * *' } // 00:05 TR saati (UTC+3)
