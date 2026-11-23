// Geçici yerel Supabase (GitHub Actions runner'ında `supabase start`) üzerinde uçtan uca smoke test.
// Canlı secret yok: yalnız yerel Supabase'in demo anahtarları ve PAYMENT_MOCK_MODE.
//
// Gereken ortam: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, APP_URL (next start)
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, APP_URL } = process.env
for (const k of ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'APP_URL']) assert.ok(process.env[k], `${k} eksik`)

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const anon = () => createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } })
const CHECKOUT_VERSION = readFileSync(new URL('../../../apps/web/src/lib/agreements/checkout-terms.ts', import.meta.url), 'utf8')
  .match(/CHECKOUT_VERSION = '([^']+)'/)[1]

const results = []
let failed = false
async function step(name, fn) {
  try {
    const note = await fn()
    results.push(`GEÇTİ  ${name}${note ? ` — ${note}` : ''}`)
  } catch (e) {
    failed = true
    results.push(`KALDI  ${name}: ${e.message}`)
  }
  console.log(results.at(-1))
}
const must = (r, label) => { if (r.error) throw new Error(`${label}: ${r.error.message}`); return r.data }
const STRONG = 'Smoke-Test-2026!'
const stamp = Date.now()

// ---------- Tohum: platform mağazası, ürün, BILGOO kampanyası ----------
let product, cheapProduct
await step('tohum: satıcı, platform mağazası, ürünler, BILGOO', async () => {
  const owner = must(await admin.auth.admin.createUser({ email: `owner-${stamp}@smoke.test`, password: STRONG, email_confirm: true }), 'owner')
  const store = must(await admin.from('stores').insert({
    owner_id: owner.user.id, store_name: 'Smoke Mağaza', store_slug: `smoke-${stamp}`,
    is_platform_store: true, phone: '05321234567', email: 'smoke@smoke.test', commission_rate: 0,
    iyzico_sub_merchant_key: 'SMOKE_SUBMERCHANT',
  }).select('id').single(), 'store')
  product = must(await admin.from('products').insert({
    name: 'Smoke Ürün', slug: `smoke-urun-${stamp}`, price: 300, stock: 10, is_active: true, store_id: store.id,
  }).select('id, price').single(), 'product')
  cheapProduct = must(await admin.from('products').insert({
    name: 'Smoke Ucuz', slug: `smoke-ucuz-${stamp}`, price: 120, stock: 10, is_active: true, store_id: store.id,
  }).select('id, price').single(), 'cheap product')
  must(await admin.from('bilgoo_offer').update({ starts_at: new Date(Date.now() - 60_000).toISOString(), product_ids: [product.id, cheapProduct.id] }).eq('singleton', true), 'offer')
  const offer = must(await anon().rpc('get_bilgoo_offer'), 'get_bilgoo_offer')
  assert.equal(offer.status, 'active')
  return `kampanya ${offer.status}`
})

// ---------- Auth ----------
await step('auth: zayıf şifre Supabase tarafından reddedilir (canlıyla aynı kural)', async () => {
  const { error } = await anon().auth.signUp({ email: `weak-${stamp}@smoke.test`, password: 'Deneme12' })
  assert.ok(error, 'hata bekleniyordu')
  assert.equal(error.code, 'weak_password', `kod: ${error.code} / ${error.message}`)
  return `${error.code}: ${error.reasons?.join(',')}`
})

const email = `musteri-${stamp}@smoke.test`
let session
await step('auth: güçlü şifreyle kayıt + oturum', async () => {
  const { data, error } = await anon().auth.signUp({ email, password: STRONG, options: { data: { first_name: 'Smoke', last_name: 'Müşteri' } } })
  if (error) throw error
  assert.ok(data.user?.identities?.length > 0, 'yeni kullanıcı kimliği yok')
  session = data.session ?? must(await anon().auth.signInWithPassword({ email, password: STRONG }), 'login').session
  assert.ok(session?.access_token)
  const profile = must(await admin.from('profiles').select('id').eq('id', data.user.id).maybeSingle(), 'profile')
  assert.ok(profile, 'profil tetikleyicisi çalışmadı')
  return 'profil oluştu'
})

await step('auth: aynı e-postayla tekrar kayıt yeni kimlik açmaz', async () => {
  const { data, error } = await anon().auth.signUp({ email, password: STRONG })
  const repeated = error ? /already/i.test(error.message) : (data.user?.identities?.length === 0)
  assert.ok(repeated, `beklenmeyen yanıt: ${error?.message ?? JSON.stringify(data.user?.identities)}`)
  return error ? `hata: ${error.message}` : 'identities: [] (form bunu artık uyarı olarak gösterir)'
})

await step('auth: yanlış şifre girişi', async () => {
  const { error } = await anon().auth.signInWithPassword({ email, password: 'Yanlis-Sifre-2026!' })
  assert.equal(error?.code, 'invalid_credentials')
})

// ---------- Web uygulaması ----------
await step('web: kayıt ve sepet sayfaları açılır', async () => {
  for (const p of ['/kayit', '/sepet', '/giris?verified=true', '/api/campaigns/bilgoo']) {
    const r = await fetch(APP_URL + p)
    assert.equal(r.status, 200, `${p} → ${r.status}`)
  }
  const flag = await (await fetch(APP_URL + '/api/campaigns/bilgoo')).json()
  assert.equal(flag.checkoutEnabled, true)
})

const api = async (body, token = session.access_token) => {
  const r = await fetch(`${APP_URL}/api/payment/initialize`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body),
  })
  return { status: r.status, body: await r.json().catch(() => ({})) }
}
const checkoutBody = (items, couponCode, extra = {}) => ({
  items, couponCode, shippingMethod: 'standard', totalPrice: 1, shippingCost: 0,
  customer: { firstName: 'Smoke', lastName: 'Müşteri', phone: '05321234567', email },
  shippingAddress: { address: 'Smoke Cad. No 1', city: 'İstanbul', district: 'Kadıköy', postalCode: '34710',
    address_line1: 'Smoke Cad. No 1', neighborhood: 'Moda', street: 'Smoke Cad.', building_no: '1' },
  ...extra,
})
async function checkout(items, couponCode, token) {
  const prep = await api(checkoutBody(items, couponCode, { prepareOnly: true }), token)
  if (prep.status !== 200) return prep
  return api(checkoutBody(items, couponCode, {
    agreements: { mesafeli_satis: true, on_bilgilendirme: true, version: CHECKOUT_VERSION, documentToken: prep.body.documentToken },
  }), token)
}
// Genel stok/başka bir 409 başarı sayılmaz: yalnız beklenen özgül mesaj.
function expectRejected(r, pattern) {
  assert.notEqual(r.body?.code, 'OUT_OF_STOCK', `stok hatası: ${r.body?.error}`)
  assert.equal(r.status, 409, JSON.stringify(r.body))
  assert.match(String(r.body?.error ?? ''), pattern, `beklenmeyen mesaj: ${r.body?.error}`)
  return r.body.error
}
const line = (p, quantity) => ({ productId: p.id, name: 'x', price: Number(p.price), quantity })

// ---------- Ödeme (PAYMENT_MOCK_MODE) ----------
await step('ödeme: geçersiz kupon ödeme başlamadan reddedilir', async () => {
  const r = await checkout([line(product, 2)], 'YOKBOYLEKOD')
  assert.equal(r.body.code, 'COUPON_INVALID', JSON.stringify(r.body))
  return expectRejected(r, /Kupon kodu bulunamadı/)
})

await step('ödeme: BILGOO 500 TL altı sepet reddedilir', async () => {
  const r = await checkout([line(cheapProduct, 2)], 'BILGOO')
  return expectRejected(r, /en az 500 TL/)
})

let order
await step('ödeme: BILGOO 600 TL sepet → mock ödeme formu, 100 TL indirim, hak ayrıldı', async () => {
  const r = await checkout([line(product, 2)], 'BILGOO')
  assert.equal(r.status, 200, JSON.stringify(r.body))
  assert.equal(r.body.mockMode, true)
  order = { id: r.body.orderId, basketId: r.body.basketId }
  const st = must(await admin.from('products').select('stock').eq('id', product.id).single(), 'stock')
  assert.equal(st.stock, 8, 'stok 10 → 8 ayrılmalı')
  const o = must(await admin.from('orders').select('total, discount_amount, payment_status, notes').eq('id', order.id).single(), 'order')
  assert.equal(Number(o.discount_amount), 100)
  assert.equal(o.payment_status, 'pending')
  const a = must(await admin.from('bilgoo_coupon_attempts').select('state, conversation_id').eq('order_id', order.id).single(), 'attempt')
  assert.equal(a.state, 'reserved')
  return `toplam ${o.total} TL, hak ${a.state}`
})

await step('ödeme: açık BILGOO ödemesi varken ikinci sipariş engellenir', async () => {
  const r = await checkout([line(product, 2)], 'BILGOO')
  return expectRejected(r, /ödemesi açık/)
})

await step('ödeme: mock callback başarı → sipariş paid, hak paid, kota 1', async () => {
  const r = await fetch(`${APP_URL}/api/payment/callback`, {
    method: 'POST', body: new URLSearchParams({ token: `mock_token_${order.basketId}` }), redirect: 'manual',
  })
  assert.equal(r.status, 303)
  const loc = r.headers.get('location') || ''
  assert.match(loc, /siparis-basarili/, loc)
  const o = must(await admin.from('orders').select('payment_status').eq('id', order.id).single(), 'order')
  assert.equal(o.payment_status, 'paid')
  const a = must(await admin.from('bilgoo_coupon_attempts').select('state').eq('order_id', order.id).single(), 'attempt')
  assert.equal(a.state, 'paid')
  const m = must(await admin.from('bilgoo_offer_metrics').select('*').single(), 'metrics')
  assert.equal(Number(m.used_slots), 1)
  return `yönlendirme ${new URL(loc, APP_URL).pathname}`
})

await step('ödeme: ilk siparişten sonra BILGOO tekrar kullanılamaz', async () => {
  const r = await checkout([line(product, 2)], 'BILGOO')
  return expectRejected(r, /yalnızca ilk siparişte/)
})

await step('ödeme: mock callback başarısızlık (bilinmeyen sepet) → Türkçe hata kodu', async () => {
  const r = await fetch(`${APP_URL}/api/payment/callback`, {
    method: 'POST', body: new URLSearchParams({ token: 'mock_token_YOK-SEPET' }), redirect: 'manual',
  })
  assert.equal(r.status, 303)
  const loc = r.headers.get('location') || ''
  assert.match(loc, /odeme\?error=/, loc)
  return new URL(loc, APP_URL).search
})

await step('ödeme: başarısız ödeme hakkı serbest bırakır (ikinci müşteri)', async () => {
  const e2 = `musteri2-${stamp}@smoke.test`
  const s2 = (await anon().auth.signUp({ email: e2, password: STRONG })).data.session
  assert.ok(s2, 'ikinci oturum yok')
  const r = await checkout([line(product, 2)], 'BILGOO', s2.access_token)
  assert.equal(r.status, 200, JSON.stringify(r.body))
  must(await admin.from('orders').update({ payment_status: 'failed' }).eq('id', r.body.orderId), 'fail order')
  const a = must(await admin.from('bilgoo_coupon_attempts').select('state').eq('order_id', r.body.orderId).single(), 'attempt')
  assert.equal(a.state, 'released')
  return 'hak released'
})

console.log('\n' + results.join('\n'))
process.exit(failed ? 1 : 0)
