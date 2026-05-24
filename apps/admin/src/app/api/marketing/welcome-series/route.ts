import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { queueEmail } from '../../../../lib/email/queue';
import { requireAdminApi } from '@/lib/auth/requireAdminApi';

export const dynamic = 'force-dynamic';

type EmailStep = 'welcome' | 'getting-started' | 'tips';

/**
 * Welcome Email Series
 * Sends a sequence of onboarding emails to new users
 */
export async function POST(req: NextRequest) {
  // Auth: admin only
  const auth = await requireAdminApi()
  if (auth instanceof NextResponse) return auth

  try {
    const { step } = await req.json();

    if (!step || !['welcome', 'getting-started', 'tips'].includes(step)) {
      return NextResponse.json(
        { error: 'Invalid step. Must be: welcome, getting-started, or tips' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Find users for this step
    let dateFilter: Date;
    const emailStep = step as EmailStep;

    if (emailStep === 'welcome') {
      // Send immediately after signup (within last hour)
      dateFilter = new Date();
      dateFilter.setHours(dateFilter.getHours() - 1);
    } else if (emailStep === 'getting-started') {
      // Send 2 days after signup
      dateFilter = new Date();
      dateFilter.setDate(dateFilter.getDate() - 2);
    } else {
      // Send 7 days after signup
      dateFilter = new Date();
      dateFilter.setDate(dateFilter.getDate() - 7);
    }

    const { data: users, error: fetchError } = await supabase
      .from('users')
      .select('id, email, full_name, created_at')
      .gte('created_at', dateFilter.toISOString())
      .not('email', 'is', null);

    if (fetchError) {
      console.error('Failed to fetch users:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      );
    }

    if (!users || users.length === 0) {
      return NextResponse.json({
        success: true,
        message: `No users found for ${step} email`,
        count: 0,
      });
    }

    const emailsSent = [];

    // Send welcome email to each user
    for (const user of users) {
      const subject = 
        emailStep === 'welcome'
          ? 'Novagross\'a Hoş Geldiniz! 🎉'
          : emailStep === 'getting-started'
          ? 'Novagross\'da İlk Alışverişinizi Yapın 🚀'
          : 'Novagross\'dan Alışveriş İpuçları 💡';

      await queueEmail({
        to: user.email,
        subject,
        template: 'marketing/welcome-series',
        priority: 'medium',
        data: {
          userName: user.full_name || user.email.split('@')[0],
          emailStep,
        },
      });

      emailsSent.push({
        userId: user.id,
        email: user.email,
        step: emailStep,
      });
    }

    return NextResponse.json({
      success: true,
      message: `${step} emails sent`,
      count: emailsSent.length,
      details: emailsSent,
    });
  } catch (error: any) {
    console.error('Welcome series error:', error);
    return NextResponse.json(
      { error: 'Failed to send welcome emails' },
      { status: 500 }
    );
  }
}
