/**
 * Supabase Auth hata mesajlarını Türkçeye çevirir.
 * https://supabase.com/docs/reference/javascript/auth-error-codes
 */
export function translateAuthError(message: string | undefined | null): string {
  if (!message) return 'Bilinmeyen bir hata oluştu. Lütfen tekrar deneyin.'

  const m = message.toLowerCase().trim()

  // Login errors
  if (m.includes('invalid login credentials') || m.includes('invalid_credentials')) {
    return 'E-posta veya şifre hatalı.'
  }
  if (m.includes('email not confirmed') || m.includes('email_not_confirmed')) {
    return 'E-posta adresiniz henüz doğrulanmadı. Lütfen gelen kutunuzu kontrol edin (spam klasörü dahil).'
  }
  if (m.includes('user not found') || m.includes('user_not_found')) {
    return 'Bu e-posta adresi ile kayıtlı bir hesap bulunamadı.'
  }
  if (m.includes('invalid grant')) {
    return 'Oturum süreniz doldu. Lütfen tekrar giriş yapın.'
  }

  // Signup errors
  if (m.includes('user already registered') || m.includes('user_already_exists') || m.includes('already been registered')) {
    return 'Bu e-posta ile zaten bir hesap var. Giriş yapmayı deneyin.'
  }
  if (m.includes('weak password') || m.includes('weak_password')) {
    return 'Şifreniz çok zayıf. En az 6 karakter, harf ve rakam içermeli.'
  }
  if (m.includes('password should be at least')) {
    return 'Şifre en az 6 karakter olmalıdır.'
  }
  if (m.includes('signup is disabled') || m.includes('signup_disabled')) {
    return 'Yeni kayıtlar şu an kapalı. Lütfen daha sonra tekrar deneyin.'
  }
  if (m.includes('email_address_invalid') || m.includes('email address') && m.includes('invalid')) {
    return 'Geçersiz e-posta adresi formatı.'
  }

  // Rate limits
  if (m.includes('rate limit') || m.includes('rate_limit') || m.includes('over_email_send_rate_limit') || m.includes('429')) {
    return 'Çok fazla istek gönderdiniz. Lütfen birkaç dakika sonra tekrar deneyin.'
  }
  if (m.includes('over_request_rate_limit')) {
    return 'Çok hızlı istek gönderiyorsunuz. Lütfen biraz bekleyin.'
  }

  // OAuth / OTP
  if (m.includes('oauth') && m.includes('error')) {
    return 'Google ile giriş başarısız. Lütfen tekrar deneyin.'
  }
  if (m.includes('token has expired') || m.includes('token_expired')) {
    return 'Bağlantı süresi doldu. Lütfen yeni bir tane talep edin.'
  }
  if (m.includes('invalid_otp') || m.includes('token is invalid') || m.includes('invalid_token')) {
    return 'Geçersiz doğrulama kodu veya bağlantı.'
  }
  if (m.includes('otp_expired')) {
    return 'Doğrulama kodunuzun süresi doldu. Yeni bir kod talep edin.'
  }

  // Password reset / change
  if (m.includes('new password should be different')) {
    return 'Yeni şifre eskisinden farklı olmalı.'
  }
  if (m.includes('password_mismatch')) {
    return 'Şifreler eşleşmiyor.'
  }

  // Network / unknown
  if (m.includes('network') || m.includes('failed to fetch')) {
    return 'İnternet bağlantı sorunu. Lütfen tekrar deneyin.'
  }
  if (m.includes('captcha')) {
    return 'CAPTCHA doğrulaması başarısız. Lütfen tekrar deneyin.'
  }

  // Default fallback — return Turkish placeholder, log original
  console.warn('[auth] Untranslated error:', message)
  return 'Bir hata oluştu. Lütfen tekrar deneyin.'
}
