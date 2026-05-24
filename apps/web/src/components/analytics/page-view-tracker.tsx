'use client'

import { useEffect } from 'react'

function createSessionId() {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID()
    }
  } catch {
    // ignore
  }
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`
}

// Get or create session ID
function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  
  let sessionId = sessionStorage.getItem('analytics_session_id')
  if (!sessionId) {
    sessionId = createSessionId()
    sessionStorage.setItem('analytics_session_id', sessionId)
  }
  return sessionId
}

// Detect device type
function getDeviceType(): string {
  if (typeof window === 'undefined') return 'unknown'
  
  const width = window.innerWidth
  if (width < 768) return 'mobile'
  if (width < 1024) return 'tablet'
  return 'desktop'
}

// Detect browser
function getBrowser(): string {
  if (typeof navigator === 'undefined') return 'unknown'
  
  const ua = navigator.userAgent
  if (ua.includes('Firefox')) return 'Firefox'
  if (ua.includes('Chrome')) return 'Chrome'
  if (ua.includes('Safari')) return 'Safari'
  if (ua.includes('Edge')) return 'Edge'
  return 'Other'
}

// Detect OS
function getOS(): string {
  if (typeof navigator === 'undefined') return 'unknown'
  
  const ua = navigator.userAgent
  if (ua.includes('Win')) return 'Windows'
  if (ua.includes('Mac')) return 'macOS'
  if (ua.includes('Linux')) return 'Linux'
  if (ua.includes('Android')) return 'Android'
  if (ua.includes('iOS')) return 'iOS'
  return 'Other'
}

/**
 * Page View Tracker Component
 * Tracks page views and sends analytics data to the backend
 */
export function PageViewTracker() {
  useEffect(() => {
    const sessionId = getSessionId()
    const startTime = Date.now()
    
    // Track page view
    const trackPageView = async () => {
      try {
        const response = await fetch('/api/analytics/page-view', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: sessionId,
            page_url: window.location.pathname + window.location.search,
            page_title: document.title,
            referrer: document.referrer || null,
            user_agent: navigator.userAgent,
            device_type: getDeviceType(),
            browser: getBrowser(),
            os: getOS(),
          }),
        })
        
        if (response.ok) {
          const data = await response.json()
          // Store page view ID to update exit time later
          sessionStorage.setItem('current_page_view_id', data.id)
        }
      } catch (error) {
        console.error('Failed to track page view:', error)
      }
    }
    
    trackPageView()
    
    // Track page exit
    const trackPageExit = async () => {
      const pageViewId = sessionStorage.getItem('current_page_view_id')
      if (!pageViewId) return
      
      const duration = Math.floor((Date.now() - startTime) / 1000)
      
      try {
        // Use sendBeacon for reliable tracking on page unload
        const data = JSON.stringify({
          page_view_id: pageViewId,
          duration_seconds: duration,
        })
        
        if (navigator.sendBeacon) {
          navigator.sendBeacon('/api/analytics/page-exit', data)
        } else {
          await fetch('/api/analytics/page-exit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: data,
            keepalive: true,
          })
        }
      } catch (error) {
        console.error('Failed to track page exit:', error)
      }
    }
    
    // Track exit on page unload
    window.addEventListener('beforeunload', trackPageExit)
    window.addEventListener('pagehide', trackPageExit)
    
    return () => {
      window.removeEventListener('beforeunload', trackPageExit)
      window.removeEventListener('pagehide', trackPageExit)
    }
  }, [])
  
  return null
}
