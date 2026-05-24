import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { csrfProtection } from '@/lib/csrf'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

/** Escape HTML special characters to prevent XSS in email templates */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export async function POST(request: NextRequest) {
  // CSRF protection
  const csrfError = csrfProtection(request)
  if (csrfError) return csrfError

  try {
    const body = await request.json()
    const { name, email, subject, message } = body

    // Validate input
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'Tüm alanlar gereklidir' },
        { status: 400 }
      )
    }

    // Save to database
    const supabase = await createClient()
    const { error: dbError } = await supabase
      .from('contact_messages')
      .insert({
        name,
        email,
        subject,
        message,
      })

    if (dbError) {
      console.error('Database error:', dbError)
      // Don't fail the request if DB save fails, continue with email
    }

    // Send email notification if Resend is configured
    if (resend && process.env.RESEND_FROM_EMAIL) {
      try {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL,
          to: process.env.CONTACT_EMAIL || process.env.RESEND_FROM_EMAIL,
          subject: `İletişim Formu: ${subject}`,
          html: `
            <h2>Yeni İletişim Mesajı</h2>
            <p><strong>Ad Soyad:</strong> ${escapeHtml(name)}</p>
            <p><strong>E-posta:</strong> ${escapeHtml(email)}</p>
            <p><strong>Konu:</strong> ${escapeHtml(subject)}</p>
            <p><strong>Mesaj:</strong></p>
            <p>${escapeHtml(message)}</p>
          `,
        })
      } catch (emailError) {
        console.error('Email error:', emailError)
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({ 
      success: true,
      message: 'Mesajınız başarıyla gönderildi' 
    })
  } catch (error) {
    console.error('Contact form error:', error)
    return NextResponse.json(
      { error: 'Bir hata oluştu' },
      { status: 500 }
    )
  }
}
