'use client'

import { usePathname } from 'next/navigation'
import TopNav from './top-nav'

const BARE_ROUTES = ['/login']

function isBareRoute(pathname: string | null) {
  if (!pathname) return false
  return BARE_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  if (isBareRoute(pathname)) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <TopNav />
      <main className="flex-1">
        <div className="max-w-screen-2xl mx-auto px-6 py-8">{children}</div>
      </main>
    </div>
  )
}
