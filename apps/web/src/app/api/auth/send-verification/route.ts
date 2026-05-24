import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { queueEmail } from '@/lib/email/queue';
import crypto from 'crypto';
import { csrfProtection } from '@/lib/csrf';

export const dynamic = 'force-dynamic';

function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function POST(req: NextRequest) {
  // CSRF protection
  const csrfError = csrfProtection(req);
  if (csrfError) return csrfError;

  try {
    const { userId } = await req.json();

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
      .select('id, email, first_name, last_name, email_verified')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if already verified
    if (profile.email_verified) {
      return NextResponse.json({
        success: true,
        message: 'Email already verified',
      });
    }

    // Generate verification token
    const verificationToken = generateVerificationToken();
    const hashedToken = hashToken(verificationToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store verification token
    const { error: insertError } = await supabase
      .from('email_verification_tokens')
      .insert({
        user_id: userId,
        token_hash: hashedToken,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error('Failed to store verification token:', insertError);
      return NextResponse.json(
        { error: 'Failed to create verification token' },
        { status: 500 }
      );
    }

    // Queue verification email
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://novagross.com';
    const verificationUrl = `${siteUrl}/api/auth/verify-email?token=${verificationToken}`;
    const userName = profile.first_name
      ? `${profile.first_name} ${profile.last_name || ''}`.trim()
      : 'Değerli Müşterimiz';

    await queueEmail({
      to: profile.email,
      subject: 'Novagross | E-posta Adresinizi Doğrulayın',
      template: 'auth/email-verification',
      priority: 'high',
      data: {
        verificationUrl,
        userName,
        expiresInHours: 24,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Verification email sent',
    });
  } catch (error: any) {
    console.error('Send verification error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}
