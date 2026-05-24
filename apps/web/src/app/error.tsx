'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@novagross/ui'
import { RefreshCw, Home, Mail, AlertTriangle } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global Error:', error)
  }, [error])

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-3xl mx-auto">
        {/* Error Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-destructive/10 mb-6">
            <AlertTriangle className="h-12 w-12 text-destructive" />
          </div>
          <h1 className="text-4xl font-bold mb-4">Bir Hata Oluştu</h1>
          <p className="text-lg text-muted-foreground mb-8">
            Üzgünüz, beklenmeyen bir sorun oluştu. Lütfen sayfayı yenilemeyi deneyin.
            Sorun devam ederse, müşteri hizmetlerimizle iletişime geçebilirsiniz.
          </p>
        </div>

        {/* Development Error Details */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-8 p-6 bg-destructive/5 border border-destructive/20 rounded-lg">
            <h2 className="font-semibold mb-3 text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Hata Detayları (Sadece Development)
            </h2>
            <div className="bg-background p-4 rounded border">
              <pre className="text-sm overflow-auto whitespace-pre-wrap break-words">
                {error.message}
              </pre>
              {error.digest && (
                <p className="text-xs mt-3 text-muted-foreground border-t pt-3">
                  Error Digest: {error.digest}
                </p>
              )}
              {error.stack && (
                <details className="mt-3">
                  <summary className="text-xs cursor-pointer text-muted-foreground hover:text-foreground">
                    Stack Trace
                  </summary>
                  <pre className="text-xs mt-2 text-muted-foreground overflow-auto">
                    {error.stack}
                  </pre>
                </details>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid sm:grid-cols-2 gap-4 mb-12">
          <Button onClick={reset} size="lg" className="h-auto py-4">
            <RefreshCw className="h-5 w-5 mr-2" />
            <div className="text-left">
              <div className="font-semibold">Sayfayı Yenile</div>
              <div className="text-xs opacity-80">Tekrar dene</div>
            </div>
          </Button>
          
          <Button asChild variant="outline" size="lg" className="h-auto py-4">
            <Link href="/">
              <Home className="h-5 w-5 mr-2" />
              <div className="text-left">
                <div className="font-semibold">Ana Sayfaya Dön</div>
                <div className="text-xs opacity-80">Başlangıca git</div>
              </div>
            </Link>
          </Button>
        </div>

        {/* Help Card */}
        <div className="p-6 bg-muted rounded-lg text-center">
          <Mail className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-semibold mb-2">Sorun Devam Ediyor mu?</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Teknik ekibimiz size yardımcı olmak için hazır. Lütfen aşağıdaki kanallardan bizimle iletişime geçin.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild variant="outline" size="sm">
              <Link href="/iletisim">
                <Mail className="h-4 w-4 mr-2" />
                İletişime Geç
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href="mailto:bilgi@teknovagroup.com">
                bilgi@teknovagroup.com
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href="tel:08508502020">
                0850 850 20 20
              </a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
