import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { queueEmail } from '@/lib/email/queue';
import crypto from 'crypto';
import { csrfProtection } from '@/lib/csrf';

export const dynamic = 'force-dynamic';

// Generate 6-digit OTP code using cryptographic randomness
function generateOTP(): string {
  return crypto.randomInt(100000, 999999).toString();
}

// SECURITY: SHA-256(user_id || '|' || code). user_id binding sayesinde
// aynı hash başka kullanıcıda kullanılamaz. Rainbow table riski yok (6 digit
// + user_id salt + 10dk expiry + 5 deneme rate-limit).
function hashOTP(userId: string, code: string): string {
  return crypto.createHash('sha256').update(`${userId}|${code}`).digest('hex');
}

export async function POST(req: NextRequest) {
  // CSRF protection
  const csrfError = csrfProtection(req);
  if (csrfError) return csrfError;

  try {
    const { userId, purpose = 'login' } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Generate OTP
    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // SECURITY: Store HASH only, never plaintext. code field kalmaya devam ediyor
    // (geriye uyumluluk için null) ama hash karşılaştırılacak.
    const codeHash = hashOTP(userId, otpCode);
    const { error: insertError } = await (supabase as any)
      .from('otp_codes')
      .insert({
        user_id: userId,
        code: null,           // plaintext sakla yok artık
        code_hash: codeHash,  // SHA-256(user_id||code)
        purpose,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error('Failed to store OTP:', insertError);
      return NextResponse.json(
        { error: 'Failed to generate OTP' },
        { status: 500 }
      );
    }

    // Queue OTP email
    const userName = profile.first_name
      ? `${profile.first_name} ${profile.last_name || ''}`.trim()
      : 'Değerli Müşterimiz';

    await queueEmail({
      to: profile.email,
      subject: 'Novagross | Tek Kullanımlık Şifre',
      template: 'auth/otp-code',
      priority: 'high',
      data: {
        otpCode,
        userName,
        purpose: purpose === 'login' ? 'Giriş' : 'İşlem',
        expiresInMinutes: 10,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'OTP sent to email',
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error: any) {
    console.error('Generate OTP error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}
