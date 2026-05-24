'use client'

import { Button } from '@novagross/ui'
import { toast } from 'sonner'

export function CopyTrackingButton({ trackingNumber }: { trackingNumber: string }) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        navigator.clipboard.writeText(trackingNumber)
        toast.success('Kopyalandı!', {
          description: 'Takip numarası panoya kopyalandı',
        })
      }}
    >
      Kopyala
    </Button>
  )
}
