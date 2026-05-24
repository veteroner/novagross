// Email Queue Helper - Queue emails for async delivery

import { createServiceRoleClient } from '@/lib/supabase/service';

type EmailTemplate =
  | 'auth/password-reset'
  | 'auth/password-changed'
  | 'auth/email-verification'
  | 'auth/otp-code'
  | 'orders/order-confirmation'
  | 'orders/order-shipped'
  | 'orders/order-delivered'
  | 'orders/order-cancelled'
  | 'orders/new-order-seller'
  | 'marketing/abandoned-cart'
  | 'marketing/welcome-series'
  | 'marketing/product-recommendations'
  | 'seller/application-received';

type EmailPriority = 'low' | 'medium' | 'high' | 'critical';

interface QueueEmailParams {
  to: string;
  subject: string;
  template: EmailTemplate;
  data: Record<string, any>;
  priority?: EmailPriority;
  scheduledAt?: Date;
}

export async function queueEmail(params: QueueEmailParams): Promise<void> {
  try {
    const supabase = createServiceRoleClient();

    await supabase.from('email_queue').insert({
      recipient: params.to,
      template: params.template,
      subject: params.subject,
      data: params.data,
      priority: params.priority || 'medium',
      scheduled_at: params.scheduledAt?.toISOString() || new Date().toISOString(),
      status: 'pending',
    });
  } catch (error) {
    console.error('Failed to queue email:', error);
    // Don't throw - email queueing failure shouldn't break the main flow
  }
}

export async function queueBulkEmails(emails: QueueEmailParams[]): Promise<void> {
  try {
    const supabase = createServiceRoleClient();

    const records = emails.map((params) => ({
      recipient: params.to,
      template: params.template,
      subject: params.subject,
      data: params.data,
      priority: params.priority || 'medium',
      scheduled_at: params.scheduledAt?.toISOString() || new Date().toISOString(),
      status: 'pending' as const,
    }));

    await supabase.from('email_queue').insert(records);
  } catch (error) {
    console.error('Failed to queue bulk emails:', error);
  }
}
