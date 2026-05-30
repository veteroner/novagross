import type { Metadata } from 'next'
import './globals.css'
import AppShell from '@/components/layout/app-shell'

export const dynamic = 'force-dynamic'

const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME || 'Trendikon'

export const metadata: Metadata = {
  title: `${BRAND_NAME} Admin`,
  description: `${BRAND_NAME} Yönetim Paneli`,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr">
      <body className="min-h-screen bg-background font-sans antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
