export const iyz = { calls: [], cancel: null, retrieve: null, refund: null, delay: 0 }
const wrap = (name) => (req, cb) => {
  iyz.calls.push({ name, req })
  const h = iyz[name]
  setTimeout(() => {
    try { const r = h(req); if (r instanceof Error) cb(r); else cb(null, r) } catch (e) { cb(e) }
  }, iyz.delay)
}
export default class Iyzipay {
  constructor() {
    this.cancel = { create: wrap('cancel') }
    this.payment = { retrieve: wrap('retrieve') }
    this.refund = { create: wrap('refund') }
  }
}
