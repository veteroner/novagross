'use client'

import { useEffect } from 'react'
import { Button } from '@novagross/ui'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Admin dashboard error:', error)
  }, [error])

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center p-8">
      <div className="text-center max-w-md">
        <h2 className="text-2xl font-bold mb-4">Admin Panel Hatası</h2>
        <p className="text-muted-foreground mb-6">
          Admin paneli yüklenirken bir hata oluştu. Bu genellikle:
        </p>
        <ul className="text-left text-sm text-muted-foreground mb-6 space-y-2">
          <li>• Veritabanı migration'larının uygulanmamış olmasından</li>
          <li>• RLS (Row Level Security) politikalarından</li>
          <li>• Yetki eksikliğinden kaynaklanır</li>
        </ul>
        <div className="space-y-3">
          <Button onClick={reset} className="w-full">
            Tekrar Dene
          </Button>
          <Button variant="outline" onClick={() => window.location.href = '/login'} className="w-full">
            Giriş Sayfasına Dön
          </Button>
        </div>
        {error.digest && (
          <p className="text-xs text-muted-foreground mt-4">
            Hata Kodu: {error.digest}
          </p>
        )}
      </div>
    </div>
  )
}
