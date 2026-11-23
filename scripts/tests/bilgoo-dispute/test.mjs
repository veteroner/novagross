import assert from 'node:assert/strict'
import { db } from './fake-supabase.mjs'
import { iyz } from './fake-iyzipay.mjs'
process.env.IYZICO_API_KEY = 'test'; process.env.IYZICO_SECRET_KEY = 'test'
const { POST } = await import('../../../apps/admin/src/app/api/iyzico/bilgoo-dispute/route.ts')

const OID = '11111111-1111-1111-1111-111111111111'
const req = () => new Request('http://x', { method: 'POST', body: JSON.stringify({ orderId: OID, note: 'iyzico panelinde tutar farkı doğrulandı' }) })
const ok = (name) => (r) => ({ status: 'success', price: '480.00', paymentId: 'P1', ...r })
function reset() {
  db.attempt = { order_id: OID, state: 'disputed', iyzico_payment_id: 'P1', dispute_progress: {}, dispute_claimed_at: null, dispute_claimed_by: null, needs_review: false }
  db.order = { order_number: 'NG-1', payment_status: 'disputed' }
  db.failUpdates = 0; db.failUpdatesAfter = Infinity; db.updates = 0; db.failComplete = false
  iyz.calls = []; iyz.delay = 0
  iyz.cancel = () => ({ status: 'success', price: '480.00', paymentId: 'P1' })
  iyz.retrieve = () => ({ status: 'success', paymentStatus: 'SUCCESS', itemTransactions: [
    { paymentTransactionId: 'T1', paidPrice: '300.00', itemId: 'I1' }, { paymentTransactionId: 'T2', paidPrice: '180.00', itemId: 'I2' }] })
  iyz.refund = () => ({ status: 'success' })
}
const count = (n) => iyz.calls.filter((c) => c.name === n).length
const results = []
async function t(name, fn) { reset(); try { await fn(); results.push(`GEÇTİ  ${name}`) } catch (e) { results.push(`KALDI  ${name}: ${e.message}`) } }

await t('1 eşzamanlı iki POST: iyzico cancel tek kez', async () => {
  iyz.delay = 50
  const [a, b] = await Promise.all([POST(req()), POST(req())])
  const st = [a.status, b.status].sort()
  assert.deepEqual(st, [200, 409]); assert.equal(count('cancel'), 1)
  assert.equal([a, b].find((r) => r.status === 409).body.reason, 'locked')
  assert.equal(db.attempt.state, 'void'); assert.equal(db.attempt.dispute_claimed_by, null)
})
await t('2 eşzamanlı iki POST, iptal reddi + kalem iadesi: her kalem tek kez', async () => {
  iyz.delay = 30; iyz.cancel = () => ({ status: 'failure', errorCode: '5094', errorMessage: 'gün sonu' })
  const [a, b] = await Promise.all([POST(req()), POST(req())])
  assert.deepEqual([a.status, b.status].sort(), [200, 409])
  assert.equal(count('cancel'), 1); assert.equal(count('refund'), 2)
  assert.deepEqual(iyz.calls.filter((c) => c.name === 'refund').map((c) => c.req.paymentTransactionId), ['T1', 'T2'])
  assert.equal(db.order.refund_amount, 480)
})
await t('3 iade yarıda reddedilirse tekrar denemede başarılı kalem yeniden çağrılmaz', async () => {
  iyz.cancel = () => ({ status: 'failure', errorCode: '5094' })
  iyz.refund = (r) => r.paymentTransactionId === 'T2' ? { status: 'failure', errorCode: '9999' } : { status: 'success' }
  const a = await POST(req()); assert.equal(a.status, 502)
  assert.equal(db.attempt.dispute_claimed_by, null, 'kesin ret sonrası kilit bırakılmalı')
  iyz.refund = () => ({ status: 'success' })
  const b = await POST(req()); assert.equal(b.status, 200)
  assert.deepEqual(iyz.calls.filter((c) => c.name === 'refund').map((c) => c.req.paymentTransactionId), ['T1', 'T2', 'T2'])
  assert.equal(count('cancel'), 1, 'iptal reddi kayıtlı; yeniden iptal denenmez')
})
await t('4 iyzico iptal başarılı, ilerleme yazımı başarısız: kilit tutulur, tekrar çağrı iyzicoya gitmez', async () => {
  // 1. yazım (niyet) başarılı, 2. yazım (sonuç) başarısız, sonrakiler (needs_review) başarısız
  db.failUpdatesAfter = 1
  const a = await POST(req()); assert.equal(a.status, 500); assert.equal(a.body.needsReview, true)
  assert.equal(count('cancel'), 1)
  assert.ok(db.attempt.dispute_progress.pending, 'niyet DBde kalmalı')
  db.failUpdatesAfter = Infinity
  const b = await POST(req()); assert.equal(b.status, 409); assert.equal(b.body.reason, 'locked')
  assert.equal(count('cancel'), 1)
  // yönetici kilidi elle açsa bile bekleyen niyet iyzicoyu yeniden çağırmayı engeller
  db.attempt.dispute_claimed_at = null; db.attempt.dispute_claimed_by = null
  const c = await POST(req()); assert.equal(c.status, 409); assert.equal(c.body.needsReview, true)
  assert.equal(count('cancel'), 1); assert.equal(db.attempt.needs_review, true)
})
await t('5 iyzico iptal başarılı, sipariş kapanışı başarısız: güvenli tekrar iyzicoya gitmeden kapatır', async () => {
  db.failComplete = true
  const a = await POST(req()); assert.equal(a.status, 500); assert.equal(a.body.retrySafe, true)
  assert.equal(db.attempt.needs_review, true); assert.equal(db.attempt.dispute_claimed_by, null)
  assert.ok(db.attempt.dispute_progress.cancel && !db.attempt.dispute_progress.pending)
  db.failComplete = false
  const b = await POST(req()); assert.equal(b.status, 200)
  assert.equal(count('cancel'), 1); assert.equal(db.attempt.state, 'void')
})
await t('6 kalem iadeleri bitti, kapanış başarısız: tekrar iyzicoya gitmez', async () => {
  iyz.cancel = () => ({ status: 'failure', errorCode: '5094' }); db.failComplete = true
  const a = await POST(req()); assert.equal(a.status, 500)
  db.failComplete = false; iyz.retrieve = () => { throw new Error('detay tekrar çağrılmamalı') }
  const b = await POST(req()); assert.equal(b.status, 200)
  assert.equal(count('refund'), 2); assert.equal(count('retrieve'), 1); assert.equal(db.order.refund_amount, 480)
})
await t('7 niyet yazılamazsa iyzico hiç çağrılmaz ve kilit bırakılır', async () => {
  db.failUpdates = 1
  const a = await POST(req()); assert.equal(a.status, 503)
  assert.equal(iyz.calls.length, 0); assert.equal(db.attempt.dispute_claimed_by, null)
})
await t('8 ağ hatasında sonuç belirsiz: kilit + niyet tutulur, tekrar çağrı yok', async () => {
  iyz.cancel = () => new Error('ECONNRESET')
  const a = await POST(req()); assert.equal(a.status, 502); assert.equal(a.body.needsReview, true)
  assert.ok(db.attempt.dispute_progress.pending); assert.ok(db.attempt.dispute_claimed_by)
  const b = await POST(req()); assert.equal(b.status, 409); assert.equal(count('cancel'), 1)
})
await t('9 kalem iadesinde ağ hatası: sonraki kalem ve tekrar çağrı yapılmaz', async () => {
  iyz.cancel = () => ({ status: 'failure', errorCode: '5094' })
  iyz.refund = (r) => r.paymentTransactionId === 'T1' ? new Error('timeout') : { status: 'success' }
  const a = await POST(req()); assert.equal(a.status, 502)
  assert.equal(count('refund'), 1); assert.equal(db.attempt.dispute_progress.pending.txId, 'T1')
})
console.log(results.join('\n'))
