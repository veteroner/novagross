'use client'

import { AppProgressBar } from 'next-nprogress-bar'

export function ProgressBar() {
  return (
    <AppProgressBar
      height="3px"
      color="#0070f3"
      options={{ showSpinner: false }}
      shallowRouting
    />
  )
}
