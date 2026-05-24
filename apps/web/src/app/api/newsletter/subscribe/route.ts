import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { csrfProtection } from '@/lib/csrf'

export async function POST(request: NextRequest) {
  // CSRF protection
  const csrfError = csrfProtection(request)
  if (csrfError) return csrfError

  try {
    const { email } = await request.json()

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Geçerli bir e-posta adresi girin' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Check if email already exists
    const { data: existing } = await supabase
      .from('email_preferences')
      .select('id, newsletters, unsubscribed_all')
      .eq('email', email.toLowerCase())
      .single()

    if (existing) {
      if (existing.unsubscribed_all) {
        return NextResponse.json(
          { error: 'Bu e-posta adresi abonelikten çıkmış' },
          { status: 400 }
        )
      }

      if (existing.newsletters) {
        return NextResponse.json(
          { message: 'Bu e-posta adresi zaten abone' },
          { status: 200 }
        )
      }

      // Update existing record
      const { error: updateError } = await supabase
        .from('email_preferences')
        .update({ newsletters: true, updated_at: new Date().toISOString() })
        .eq('id', existing.id)

      if (updateError) throw updateError

      return NextResponse.json({
        success: true,
        message: 'Bültene başarıyla abone oldunuz!',
      })
    }

    // Create new subscription
    const { error: insertError } = await supabase
      .from('email_preferences')
      .insert({
        email: email.toLowerCase(),
        newsletters: true,
        marketing: true,
        product_updates: true,
        abandoned_cart: true,
        wishlist_alerts: false,
        review_requests: false,
        order_updates: true,
      })

    if (insertError) throw insertError

    return NextResponse.json({
      success: true,
      message: 'Bültene başarıyla abone oldunuz!',
    })
  } catch (error) {
    console.error('Newsletter subscription error:', error)
    return NextResponse.json(
      { error: 'Bir hata oluştu. Lütfen tekrar deneyin.' },
      { status: 500 }
    )
  }
}
