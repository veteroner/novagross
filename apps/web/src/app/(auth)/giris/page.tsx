import Link from 'next/link'
import { LoginForm } from '@/components/auth/login-form'

export default function LoginPage() {
  return (
    <div className="container flex min-h-[calc(100vh-200px)] items-center justify-center py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Giriş Yap</h1>
          <p className="text-muted-foreground mt-2">
            Hesabınıza giriş yapın
          </p>
        </div>

        <LoginForm />

        <div className="text-center text-sm">
          <span className="text-muted-foreground">Hesabınız yok mu? </span>
          <Link href="/kayit" className="font-medium text-primary hover:underline">
            Kayıt Ol
          </Link>
        </div>
      </div>
    </div>
  )
}
