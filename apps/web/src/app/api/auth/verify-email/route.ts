import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.redirect(
        new URL('/giris?error=invalid_token', req.url)
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const hashedToken = hashToken(token);

    // Find verification token
    const { data: verificationToken, error: tokenError } = await supabase
      .from('email_verification_tokens')
      .select('*, profiles(id, email, first_name)')
      .eq('token_hash', hashedToken)
      .is('verified_at', null)
      .single();

    if (tokenError || !verificationToken) {
      return NextResponse.redirect(
        new URL('/giris?error=invalid_token', req.url)
      );
    }

    // Check expiration
    if (new Date(verificationToken.expires_at) < new Date()) {
      return NextResponse.redirect(
        new URL('/giris?error=expired_token', req.url)
      );
    }

    // Mark email as verified
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        email_verified: true,
        email_verified_at: new Date().toISOString(),
      })
      .eq('id', verificationToken.user_id);

    if (updateError) {
      console.error('Failed to verify email:', updateError);
      return NextResponse.redirect(
        new URL('/giris?error=verification_failed', req.url)
      );
    }

    // Mark token as used
    await supabase
      .from('email_verification_tokens')
      .update({ verified_at: new Date().toISOString() })
      .eq('id', verificationToken.id);

    // Redirect to success page
    return NextResponse.redirect(
      new URL('/giris?verified=true', req.url)
    );
  } catch (error: any) {
    console.error('Email verification error:', error);
    return NextResponse.redirect(
      new URL('/giris?error=verification_failed', req.url)
    );
  }
}
