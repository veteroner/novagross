'use client'

import { useState } from 'react'
import { Button } from '@novagross/ui'

export function BilgooOfferActions({ available }: { available: boolean }) {
  const [status, setStatus] = useState('')
  async function copyCode() {
    try {
      await navigator.clipboard.writeText('BILGOO')
      setStatus('Kod kopyalandı.')
    } catch {
      setStatus('Kodu seçip elle kopyalayabilirsin.')
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-3">
      <code className="rounded border px-3 py-2 font-bold">BILGOO</code>
      <Button type="button" onClick={copyCode} disabled={!available}>Kodu kopyala</Button>
      <span role="status">{status}</span>
    </div>
  )
}
