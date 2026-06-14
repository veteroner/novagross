import TopNav from '@/components/layout/top-nav'
import { SellerSupportWidget } from '@/components/support/chat-widget'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <TopNav />
      <main className="flex-1">
        <div className="max-w-screen-2xl mx-auto px-6 py-8">{children}</div>
      </main>
      <SellerSupportWidget />
    </div>
  )
}
