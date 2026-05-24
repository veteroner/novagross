// API Route: Quick Test Email
// GET /api/email/test

import { NextRequest, NextResponse } from 'next/server';
import { getEmailService } from '@/lib/email/service';
import { requireAdminApi } from '@/lib/auth/requireAdminApi';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Auth: admin only
  const auth = await requireAdminApi()
  if (auth instanceof NextResponse) return auth

  try {
    const emailService = getEmailService();
    const from = process.env.RESEND_TEST_FROM || 'onboarding@resend.dev';

    // Test e-postası gönder
    const result = await emailService.sendEmail({
      to: 'delivered@resend.dev', // Resend test email
      from,
      subject: 'Novagross - Test Email',
      template: 'auth/password-reset',
      data: {
        resetUrl: 'https://novagross.com/reset-password?token=test_abc123',
        userName: 'Test Kullanıcı',
        requestedAt: new Date().toLocaleString('tr-TR'),
        ipAddress: '192.168.1.1',
        deviceLabel: 'Chrome on macOS',
        expiresInMinutes: 15,
      },
    });

    if (result.success) {
      return NextResponse.json(
        {
          success: true,
          message: 'Test email gönderildi.',
          resendId: result.id,
          dashboardUrl: 'https://resend.com/emails',
          from,
          to: 'delivered@resend.dev',
        },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          help: 'Resend API key ve sender domain doğrulamasını kontrol edin.',
        },
        { status: 500, headers: { 'Cache-Control': 'no-store' } }
      );
    }
  } catch (error: any) {
    console.error('Test email error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Test email failed',
      },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
