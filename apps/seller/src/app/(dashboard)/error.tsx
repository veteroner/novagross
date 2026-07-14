'use client'

import { useEffect } from 'react'
import { Button } from '@novagross/ui'
import { AlertTriangle } from 'lucide-react'

/**
 * Dashboard segment error boundary. Bir sayfa render sırasında hata verirse
 * tüm uygulamanın çıplak 500 ile çökmesi yerine burada dostça bir ekran
 * gösterilir. `digest`, sunucu loglarındaki gerçek hatayla eşleştirmek için.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Tarayıcı konsoluna da düşür (destek için)
    console.error('[dashboard error]', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center text-center py-24 px-6">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-50 text-red-600 mb-4">
        <AlertTriangle className="h-7 w-7" />
      </div>
      <h1 className="text-xl font-bold text-gray-900 mb-1">Bir şeyler ters gitti</h1>
      <p className="text-sm text-gray-600 max-w-md">
        Bu sayfa yüklenirken beklenmeyen bir hata oluştu. Tekrar deneyebilir ya
        da destek ekibine başvurabilirsiniz.
      </p>
      {error?.digest && (
        <p className="text-xs text-gray-400 mt-2">Hata kodu: {error.digest}</p>
      )}
      <div className="flex gap-2 mt-6">
        <Button onClick={() => reset()}>Tekrar Dene</Button>
        <Button variant="outline" onClick={() => (window.location.href = '/')}>
          Ana Sayfa
        </Button>
      </div>
    </div>
  )
}
