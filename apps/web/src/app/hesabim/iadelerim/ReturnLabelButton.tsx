'use client'

export function ReturnLabelButton({
  trackingNumber,
  barcodeData,
  labelUrl,
}: {
  trackingNumber?: string | null
  barcodeData?: string | null
  labelUrl?: string | null
}) {
  const print = () => {
    if (labelUrl && /^https?:\/\//.test(labelUrl) && !labelUrl.includes('example.com')) {
      window.open(labelUrl, '_blank', 'noopener,noreferrer')
      return
    }
    if (!barcodeData) return
    const isPdf = barcodeData.startsWith('JVBER')
    const src = isPdf
      ? `data:application/pdf;base64,${barcodeData}`
      : `data:image/png;base64,${barcodeData}`
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(
      isPdf
        ? `<iframe src="${src}" style="width:100%;height:100vh;border:0" onload="this.contentWindow.print()"></iframe>`
        : `<body style="text-align:center;font-family:sans-serif"><h3>İade Kargo Barkodu</h3><p>Takip No: ${
            trackingNumber || ''
          }</p><img src="${src}" style="max-width:100%" onload="window.print()"/></body>`
    )
    w.document.close()
  }

  if (!barcodeData && !(labelUrl && !labelUrl.includes('example.com'))) return null

  return (
    <button
      onClick={print}
      className="mt-1 inline-flex items-center gap-1 rounded bg-orange-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-700"
    >
      🖨️ İade Kargo Barkodunu Yazdır
    </button>
  )
}
