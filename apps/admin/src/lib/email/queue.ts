// Email Queue Helper - Queue emails for async delivery

import { createClient } from '@supabase/supabase-js';

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
  | 'seller/application-received'
  | 'seller/weekly-payout-processed'
  | 'admin/weekly-payout-summary'
  | 'returns/request-received'
  | 'returns/request-received-admin'
  | 'returns/approved'
  | 'returns/rejected'
  | 'returns/refunded';

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
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

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
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const records = emails.map((params) => ({
      recipient: params.to,
      template: params.template,
      subject: params.subject,
      data: params.data,
      priority: params.priority || 'medium',
      scheduled_at: params.scheduledAt?.toISOString() || new Date().toISOString(),
      status: 'pending',
    }));

    await supabase.from('email_queue').insert(records);
  } catch (error) {
    console.error('Failed to queue bulk emails:', error);
  }
}
