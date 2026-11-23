// Tek satırlık bilgoo_coupon_attempts + orders için bellek içi Supabase taklidi.
// claim_bilgoo_dispute ve complete_bilgoo_dispute_refund SQL'deki koşulları birebir izler.
export const db = { attempt: null, order: null, failUpdates: 0, failUpdatesAfter: Infinity, updates: 0, failComplete: false }
const clone = (x) => JSON.parse(JSON.stringify(x))
function updateBuilder(patch) {
  const filters = []
  const b = {
    eq(col, val) { filters.push([col, val]); return b },
    select() { b._select = true; return b },
    then(res, rej) {
      db.updates++
      if (db.failUpdates > 0 || db.updates > db.failUpdatesAfter) {
        if (db.failUpdates > 0) db.failUpdates--
        return Promise.resolve({ data: null, error: { message: 'simüle edilen DB yazım hatası' } }).then(res, rej)
      }
      const a = db.attempt
      const ok = a && filters.every(([c, v]) => (c === 'order_id' ? a.order_id : a[c]) === v)
      if (ok) Object.assign(a, clone(patch))
      return Promise.resolve({ data: ok ? [{ order_id: a.order_id }] : [], error: null }).then(res, rej)
    },
  }
  return b
}
export function createServiceRoleClient() {
  return {
    from(table) {
      if (table !== 'bilgoo_coupon_attempts') throw new Error('beklenmeyen tablo ' + table)
      return { update: (patch) => updateBuilder(patch) }
    },
    async rpc(name, args) {
      const a = db.attempt, o = db.order
      if (name === 'claim_bilgoo_dispute') {
        // SQL'deki tek UPDATE ... WHERE dispute_claimed_at IS NULL: JS tek iş parçacığı, atomik
        if (a && a.order_id === args.p_order_id && a.state === 'disputed' && !a.dispute_claimed_at && a.iyzico_payment_id && o.payment_status === 'disputed') {
          a.dispute_claimed_at = new Date().toISOString(); a.dispute_claimed_by = args.p_claimer
          return { data: { ok: true, payment_id: a.iyzico_payment_id, progress: clone(a.dispute_progress), order_number: o.order_number }, error: null }
        }
        const reason = !a || a.state !== 'disputed' ? 'not_disputed' : !a.iyzico_payment_id ? 'no_reference' : a.dispute_claimed_at ? 'locked' : 'not_disputed'
        return { data: { ok: false, reason }, error: null }
      }
      if (name === 'complete_bilgoo_dispute_refund') {
        if (db.failComplete) return { data: null, error: { message: 'simüle edilen kapanış hatası' } }
        if (a.state !== 'disputed' || o.payment_status !== 'disputed') return { data: false, error: null }
        o.payment_status = 'refunded'; o.refund_amount = args.p_amount; a.state = 'void'
        return { data: true, error: null }
      }
      throw new Error('beklenmeyen rpc ' + name)
    },
  }
}
