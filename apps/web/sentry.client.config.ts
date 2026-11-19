import * as Sentry from '@sentry/nextjs'
import { hasConsent } from './src/lib/privacy/consent'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampler: () => hasConsent('analytics') ? 0.1 : 0,
  beforeSendTransaction: (event) => hasConsent('analytics') ? event : null,
  replaysOnErrorSampleRate: 0,
  replaysSessionSampleRate: 0,

  environment: process.env.NODE_ENV,

  // Filter out some errors
  beforeSend(event, hint) {
    if (!hasConsent('analytics')) return null
    const error = hint.originalException

    // Don't send errors from browser extensions
    if (
      error &&
      typeof error === 'object' &&
      'stack' in error &&
      typeof error.stack === 'string' &&
      (error.stack.includes('chrome-extension://') ||
        error.stack.includes('moz-extension://'))
    ) {
      return null
    }

    return event
  },

  // Ignore certain errors
  ignoreErrors: [
    // Random plugins/extensions
    'top.GLOBALS',
    // See: http://blog.errorception.com/2012/03/tale-of-unfindable-js-error.html
    'originalCreateNotification',
    'canvas.contentDocument',
    'MyApp_RemoveAllHighlights',
    'http://tt.epicplay.com',
    "Can't find variable: ZiteReader",
    'jigsaw is not defined',
    'ComboSearch is not defined',
    'http://loading.retry.widdit.com/',
    'atomicFindClose',
    // Facebook borked
    'fb_xd_fragment',
    // ISP "optimizing" proxy - `Cache-Control: no-transform` seems to
    // reduce this. (thanks @acdha)
    'bmi_SafeAddOnload',
    'EBCallBackMessageReceived',
    // See http://toolbar.conduit.com/Developer/HtmlAndGadget/Methods/JSInjection.aspx
    'conduitPage',
    // Network errors
    'NetworkError',
    'Network request failed',
    'Failed to fetch',
    // Browser extension errors
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications',
  ],

  denyUrls: [
    // Chrome extensions
    /extensions\//i,
    /^chrome:\/\//i,
    /^chrome-extension:\/\//i,
    // Firefox extensions
    /^moz-extension:\/\//i,
    // Other extensions
    /^safari-extension:\/\//i,
    /^safari-web-extension:\/\//i,
  ],
})
