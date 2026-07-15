// MNG Kargo API sabit-IP relay'i.
//
// Netlify fonksiyonlarının çıkış IP'si sabit değil (her istekte değişebilir),
// MNG'nin barkod/tekli işlem uçları ise sabit IP whitelist'i istiyor. Bu
// küçük relay, sabit IP'li bir VPS üzerinde çalışır; Netlify buraya istek
// atar, bu da isteği aynen (path/method/header/body) MNG'nin gerçek
// gateway'ine iletir ve yanıtı aynen geri döner. Kod/iş mantığı burada
// YOKTUR — auth, hata ayrıştırma vb. hepsi mevcut mng.ts'te kalır.
//
// Güvenlik: yalnızca doğru "x-relay-secret" header'ını taşıyan istekler
// iletilir; aksi halde 403. Bu olmadan sunucu, internete açık bir MNG
// relay'i olarak kötüye kullanılabilir.
//
// Bağımlılık yok — sadece Node 18+ (yerleşik fetch) gerekir.

const http = require('http')

const PORT = Number(process.env.PORT || 8080)
const SECRET = process.env.PROXY_SECRET || ''
const TARGET_BASE = (process.env.TARGET_BASE_URL || 'https://api.mngkargo.com.tr').replace(/\/$/, '')

if (!SECRET) {
  console.error('PROXY_SECRET ayarlanmamış — sunucu başlatılmıyor (güvenlik).')
  process.exit(1)
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.headers['x-relay-secret'] !== SECRET) {
      res.writeHead(403, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ error: 'forbidden' }))
      return
    }

    const body = await readBody(req)
    const forwardHeaders = { ...req.headers }
    delete forwardHeaders.host
    delete forwardHeaders['content-length']
    delete forwardHeaders['x-relay-secret']
    delete forwardHeaders.connection

    const upstream = await fetch(`${TARGET_BASE}${req.url}`, {
      method: req.method,
      headers: forwardHeaders,
      body: body.length ? body : undefined,
    })

    const text = await upstream.text()
    res.writeHead(upstream.status, {
      'content-type': upstream.headers.get('content-type') || 'application/json',
    })
    res.end(text)
  } catch (e) {
    console.error('[mng-proxy] error', e)
    res.writeHead(502, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ error: 'proxy_error', message: e.message }))
  }
})

server.listen(PORT, () => {
  console.log(`[mng-proxy] dinliyor: ${PORT} → ${TARGET_BASE}`)
})
