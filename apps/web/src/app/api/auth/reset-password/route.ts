import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { queueEmail } from '@/lib/email/queue';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// Helper: Hash token for verification
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token ve şifre gereklidir' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Şifre en az 8 karakter olmalıdır' },
        { status: 400 }
      );
    }

    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      return NextResponse.json(
        { error: 'Şifre büyük/küçük harf ve rakam içermelidir' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const hashedToken = hashToken(token);

    // Find and validate reset token
    const { data: resetToken, error: tokenError } = await supabase
      .from('password_reset_tokens')
      .select('*, profiles(id, email, first_name, last_name)')
      .eq('token_hash', hashedToken)
      .is('used_at', null)
      .single();

    if (tokenError || !resetToken) {
      return NextResponse.json(
        { error: 'Geçersiz veya kullanılmış şifre sıfırlama bağlantısı' },
        { status: 400 }
      );
    }

    // Check if token expired
    if (new Date(resetToken.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Şifre sıfırlama bağlantısının süresi dolmuş. Yeni bir bağlantı talep edin.' },
        { status: 400 }
      );
    }

    const profile = resetToken.profiles as any;

    // Update user password in Supabase Auth
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      resetToken.user_id,
      { password }
    );

    if (updateError) {
      console.error('Failed to update password:', updateError);
      return NextResponse.json(
        { error: 'Şifre güncellenirken bir hata oluştu' },
        { status: 500 }
      );
    }

    // Mark token as used
    await supabase
      .from('password_reset_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('id', resetToken.id);

    // Queue password changed confirmation email
    const userName = profile.first_name
      ? `${profile.first_name} ${profile.last_name || ''}`.trim()
      : 'Değerli Müşterimiz';

    await queueEmail({
      to: profile.email,
      subject: 'Novagross | Şifreniz Değiştirildi',
      template: 'auth/password-changed',
      priority: 'high',
      data: {
        userName,
        changedAt: new Date().toLocaleString('tr-TR'),
        ipAddress: req.headers.get('x-forwarded-for') || req.ip || 'Unknown',
        deviceLabel: req.headers.get('user-agent')?.split(' ')[0] || 'Unknown Device',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Şifreniz başarıyla değiştirildi',
    });
  } catch (error: any) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'Bir hata oluştu. Lütfen tekrar deneyin.' },
      { status: 500 }
    );
  }
}
