import type { Metadata } from 'next'
import './globals.css'
import { SessionGuard } from '@/components/session-guard'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Novagross Satıcı Paneli',
  description: 'Novagross Marketplace - Satıcı Yönetim Paneli',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr">
      <body className="min-h-screen bg-background font-sans antialiased">
        <SessionGuard />
        {children}
      </body>
    </html>
  )
}
