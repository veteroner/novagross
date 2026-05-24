import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { queueEmail } from '@/lib/email/queue';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// Helper: Generate secure reset token
function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Helper: Hash token for DB storage
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Geçerli bir e-posta adresi girin' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check if user exists (don't reveal if email is registered - security)
    const { data: user } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name')
      .eq('email', email)
      .single();

    // Always return success to prevent email enumeration
    // But only send email if user exists
    if (user) {
      const resetToken = generateResetToken();
      const hashedToken = hashToken(resetToken);
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      // Store reset token in database
      const { error: insertError } = await supabase.from('password_reset_tokens').insert({
        user_id: user.id,
        token_hash: hashedToken,
        expires_at: expiresAt.toISOString(),
      });

      if (insertError) {
        console.error('Failed to store reset token:', insertError);
        return NextResponse.json(
          { error: 'Bir hata oluştu. Lütfen tekrar deneyin.' },
          { status: 500 }
        );
      }

      // Queue password reset email
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://novagross.com';
      const resetUrl = `${siteUrl}/sifre-sifirla?token=${resetToken}`;
      const userName = user.first_name
        ? `${user.first_name} ${user.last_name || ''}`.trim()
        : 'Değerli Müşterimiz';

      await queueEmail({
        to: email,
        subject: 'Novagross | Şifre Sıfırlama Bağlantısı',
        template: 'auth/password-reset',
        priority: 'high',
        data: {
          resetUrl,
          userName,
          requestedAt: new Date().toLocaleString('tr-TR'),
          ipAddress: req.headers.get('x-forwarded-for') || req.ip || 'Unknown',
          deviceLabel:
            req.headers.get('user-agent')?.split(' ')[0] || 'Unknown Device',
          expiresInMinutes: 15,
        },
      });
    }

    // Always return success (security best practice)
    return NextResponse.json({
      success: true,
      message: 'Eğer bu e-posta kayıtlıysa, şifre sıfırlama bağlantısı gönderildi.',
    });
  } catch (error: any) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Bir hata oluştu. Lütfen tekrar deneyin.' },
      { status: 500 }
    );
  }
}
