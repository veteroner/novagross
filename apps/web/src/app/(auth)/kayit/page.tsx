import Link from 'next/link'
import { RegisterForm } from '@/components/auth/register-form'

export default function RegisterPage() {
  return (
    <div className="container flex min-h-[calc(100vh-200px)] items-center justify-center py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Kayıt Ol</h1>
          <p className="text-muted-foreground mt-2">
            Yeni bir hesap oluşturun
          </p>
        </div>

        <RegisterForm />

        <div className="text-center text-sm">
          <span className="text-muted-foreground">Zaten hesabınız var mı? </span>
          <Link href="/giris" className="font-medium text-primary hover:underline">
            Giriş Yap
          </Link>
        </div>
      </div>
    </div>
  )
}
