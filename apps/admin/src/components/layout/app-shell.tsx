'use client'

import { usePathname } from 'next/navigation'
import Sidebar from './sidebar'

// Routes that should render WITHOUT the admin sidebar/chrome.
// Login is the obvious one — add others (e.g. /forgot-password) here.
const BARE_ROUTES = ['/login']

function isBareRoute(pathname: string | null) {
  if (!pathname) return false
  return BARE_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  if (isBareRoute(pathname)) {
    // Auth pages own their full-screen centered layout.
    return <>{children}</>
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  )
}
