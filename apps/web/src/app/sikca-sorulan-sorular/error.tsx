'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { Button } from '@novagross/ui'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Route error:', error)
  }, [error])

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-2xl mx-auto text-center">
        <div className="text-6xl mb-4">⚠️</div>
        <h1 className="text-4xl font-bold mb-4">Bir Hata Oluştu</h1>
        <p className="text-lg text-muted-foreground mb-8">
          Sayfa yüklenirken bir sorun oluştu. Lütfen tekrar deneyin.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button onClick={reset} size="lg">
            Tekrar Dene
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/">Ana Sayfaya Dön</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
