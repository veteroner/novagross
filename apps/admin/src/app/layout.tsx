import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/layout/sidebar'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Novagross Admin',
  description: 'Novagross Yönetim Paneli',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr">
      <body className="min-h-screen bg-background font-sans antialiased">
        <div className="flex h-screen bg-gray-100">
          <Sidebar />
          <main className="flex-1 overflow-y-auto p-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
