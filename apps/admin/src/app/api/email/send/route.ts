// API Route: Send Email
// POST /api/email/send

import { NextRequest, NextResponse } from 'next/server';
import { getEmailService } from '@/lib/email/service';
import { requireAdminApi } from '@/lib/auth/requireAdminApi';
import type { SendEmailParams } from '@/lib/email/types';

export async function POST(request: NextRequest) {
  // Auth: admin only
  const auth = await requireAdminApi()
  if (auth instanceof NextResponse) return auth

  try {
    const body: SendEmailParams = await request.json();

    // Validation
    if (!body.to || !body.subject || !body.template) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, template' },
        { status: 400 }
      );
    }

    // Send email
    const emailService = getEmailService();
    const result = await emailService.sendEmail(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      id: result.id,
      message: 'Email sent successfully',
    });
  } catch (error: any) {
    console.error('Email send API error:', error);
    
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}
