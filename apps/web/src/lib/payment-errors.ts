// /api/payment/callback'in /odeme?error=<kod> ile döndürdüğü kodların kullanıcı mesajları.
// Kod listede yoksa (iyzico'nun kendi mesajı) metin olduğu gibi gösterilir.
const MESSAGES: Record<string, string> = {
  invalid_token: 'Ödeme oturumu bulunamadı. Lütfen ödemeyi yeniden başlatın.',
  missing_basket_id: 'Ödeme sonucu siparişle eşleştirilemedi. Kartınızdan çekim yapıldıysa destek ekibimize yazın.',
  order_not_found: 'Sipariş bulunamadı. Kartınızdan çekim yapıldıysa destek ekibimize yazın.',
  amount_mismatch: 'Ödenen tutar sipariş tutarıyla eşleşmedi. Siparişiniz incelemeye alındı; ekibimiz sizinle iletişime geçecek.',
  order_update_failed: 'Ödeme sonucu kaydedilemedi. Kartınızdan çekim yapıldıysa sipariş birkaç dakika içinde güncellenir; olmazsa destek ekibimize yazın.',
  payment_update_failed: 'Ödeme kaydı tamamlanamadı. Kartınızdan çekim yapıldıysa destek ekibimize yazın.',
  callback_error: 'Ödeme sonucu alınırken bir hata oluştu. Lütfen siparişlerinizi kontrol edin veya tekrar deneyin.',
}

export function paymentErrorMessage(code: string | null | undefined): string | null {
  if (!code) return null
  const raw = (() => { try { return decodeURIComponent(code) } catch { return code } })().trim()
  return MESSAGES[raw] ?? raw.slice(0, 300)
}
