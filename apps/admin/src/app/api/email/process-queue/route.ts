// API Route: Process Email Queue
// POST /api/email/process-queue

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { getEmailService } from '@/lib/email/service';
import type { EmailTemplate } from '@/lib/email/types';

export const dynamic = 'force-dynamic';

const PRIORITY_WEIGHT: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

function clampInt(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getBackoffMs(attempt: number): number {
  // Exponential backoff with jitter, capped at 60 minutes
  const base = Math.min(60 * 60 * 1000, 30 * 1000 * Math.pow(2, attempt));
  const jitter = Math.floor(Math.random() * 5_000);
  return base + jitter;
}

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.EMAIL_QUEUE_PROCESSOR_SECRET;
  if (!secret) {
    console.error('EMAIL_QUEUE_PROCESSOR_SECRET is not set – rejecting request');
    return false;
  }

  const authHeader = req.headers.get('authorization') || '';
  return authHeader === `Bearer ${secret}`;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const url = new URL(req.url);
  const limit = clampInt(Number(url.searchParams.get('limit') || 10), 1, 50);
  const maxRetries = clampInt(Number(process.env.EMAIL_QUEUE_MAX_RETRIES || 5), 1, 20);

  const supabase = createServiceRoleClient();
  const emailService = getEmailService();
  const nowIso = new Date().toISOString();

  const { data: pending, error: pendingError } = await supabase
    .from('email_queue')
    .select('id, recipient, template, subject, data, priority, scheduled_at, retry_count')
    .eq('status', 'pending')
    .lte('scheduled_at', nowIso)
    .order('scheduled_at', { ascending: true })
    .limit(limit);

  if (pendingError) {
    return NextResponse.json(
      { ok: false, error: pendingError.message },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const sorted = (pending || []).sort((a: any, b: any) => {
    const pa = PRIORITY_WEIGHT[a.priority] || 0;
    const pb = PRIORITY_WEIGHT[b.priority] || 0;
    if (pa !== pb) return pb - pa;
    return String(a.scheduled_at).localeCompare(String(b.scheduled_at));
  });

  const claimed: any[] = [];
  for (const item of sorted) {
    const { data: updated, error: claimError } = await supabase
      .from('email_queue')
      .update({ status: 'processing' })
      .eq('id', item.id)
      .eq('status', 'pending')
      .select('id, recipient, template, subject, data, priority, scheduled_at, retry_count')
      .maybeSingle();

    if (claimError) {
      console.warn('Queue claim failed:', claimError);
      continue;
    }

    if (updated) claimed.push(updated);
  }

  let sent = 0;
  let rescheduled = 0;
  let failed = 0;

  for (const item of claimed) {
    const sendResult = await emailService.sendEmail({
      to: item.recipient,
      subject: item.subject,
      template: item.template as EmailTemplate,
      data: item.data || {},
    });

    if (sendResult.success) {
      sent += 1;
      await supabase
        .from('email_queue')
        .update({ status: 'sent', last_error: null })
        .eq('id', item.id);
      continue;
    }

    const nextRetry = Number(item.retry_count || 0) + 1;
    const lastError = sendResult.error || 'Unknown send error';

    if (nextRetry >= maxRetries) {
      failed += 1;
      await supabase
        .from('email_queue')
        .update({
          status: 'failed',
          retry_count: nextRetry,
          last_error: lastError,
        })
        .eq('id', item.id);
    } else {
      rescheduled += 1;
      const nextScheduledAt = new Date(Date.now() + getBackoffMs(nextRetry)).toISOString();
      await supabase
        .from('email_queue')
        .update({
          status: 'pending',
          retry_count: nextRetry,
          last_error: lastError,
          scheduled_at: nextScheduledAt,
        })
        .eq('id', item.id);
    }
  }

  return NextResponse.json(
    {
      ok: true,
      scanned: (pending || []).length,
      claimed: claimed.length,
      sent,
      rescheduled,
      failed,
      maxRetries,
      now: nowIso,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
