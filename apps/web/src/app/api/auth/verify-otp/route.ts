import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { csrfProtection } from '@/lib/csrf';

export const dynamic = 'force-dynamic';

function hashOTP(userId: string, code: string): string {
  return crypto.createHash('sha256').update(`${userId}|${code}`).digest('hex');
}

export async function POST(req: NextRequest) {
  // CSRF protection
  const csrfError = csrfProtection(req);
  if (csrfError) return csrfError;

  try {
    const { userId, code, purpose = 'login' } = await req.json();

    if (!userId || !code) {
      return NextResponse.json(
        { error: 'User ID and code are required' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // SECURITY: Hash karşılaştırma; plaintext code DB'de yok
    const codeHash = hashOTP(userId, String(code));
    const { data: otpRecord, error: otpError } = await (supabase as any)
      .from('otp_codes')
      .select('*')
      .eq('user_id', userId)
      .eq('code_hash', codeHash)
      .eq('purpose', purpose)
      .is('verified_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (otpError || !otpRecord) {
      return NextResponse.json(
        { error: 'Geçersiz veya süresi dolmuş OTP kodu' },
        { status: 400 }
      );
    }

    // Mark OTP as verified
    await supabase
      .from('otp_codes')
      .update({ verified_at: new Date().toISOString() })
      .eq('id', otpRecord.id);

    return NextResponse.json({
      success: true,
      message: 'OTP verified successfully',
    });
  } catch (error: any) {
    console.error('Verify OTP error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}
