'use client'
import type { CheckoutDocument } from '@/lib/agreements/checkout-document'
import { checkoutDocumentText } from '@/lib/agreements/checkout-document'
export function CheckoutDocuments({ document }: { document: CheckoutDocument }) {
  const text = checkoutDocumentText(document)
  const download = () => {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }))
    const a = window.document.createElement('a'); a.href = url; a.download = `novagross-siparis-belgeleri-${document.version}.txt`; a.click(); URL.revokeObjectURL(url)
  }
  return <section className="rounded-lg border p-4 space-y-3"><h2 className="font-semibold">Siparişinize Özel Belgeler</h2><p className="text-sm">Vergiler dahil toplam: <strong>{document.total.toFixed(2)} TL</strong>. Satıcı, ürün, adres ve koşulları onaylamadan önce inceleyin.</p><details><summary className="cursor-pointer text-sm underline">Ön Bilgilendirme ve Satış Sözleşmesini Oku</summary><pre className="mt-3 max-h-96 overflow-y-auto whitespace-pre-wrap break-words text-xs font-sans leading-relaxed" tabIndex={0}>{text}</pre></details><button type="button" onClick={download} className="text-sm underline">Belgeleri İndir</button></section>
}
