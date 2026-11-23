import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Ödeme başlatma ile aynı bayrak: kapalıyken istemci BILGOO'yu hiç uygulamaz,
// böylece indirim sepette görünüp ödemede reddedilmez.
export async function GET() {
  return NextResponse.json(
    { checkoutEnabled: process.env.BILGOO_OFFER_CHECKOUT_ENABLED === '1' },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
