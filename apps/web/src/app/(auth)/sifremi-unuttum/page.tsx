import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  return (
    <div className="container flex min-h-[calc(100vh-200px)] items-center justify-center py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Şifremi Unuttum</h1>
          <p className="text-muted-foreground mt-2">
            E-posta adresinizi girin, size şifre sıfırlama bağlantısı gönderelim
          </p>
        </div>

        <ForgotPasswordForm />

        <div className="text-center text-sm">
          <Link href="/giris" className="font-medium text-primary hover:underline">
            ← Giriş sayfasına dön
          </Link>
        </div>
      </div>
    </div>
  )
}
