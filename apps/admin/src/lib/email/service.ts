// Email Service - Core email sending functionality

import { Resend } from 'resend';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { EmailLogger } from './logger';
import type {
  SendEmailParams,
  SendResult,
  QueueEmailParams,
  EmailTemplate,
} from './types';

export class EmailService {
  private resend: Resend;
  private from: string;

  constructor() {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY environment variable is not set');
    }

    this.resend = new Resend(process.env.RESEND_API_KEY);
    this.from = `${process.env.RESEND_FROM_NAME || 'Novagross'} <${
      process.env.RESEND_FROM_EMAIL || 'bildirim@novagross.com'
    }>`;
  }

  /**
   * Anında e-posta gönder (transactional emails için)
   */
  async sendEmail(params: SendEmailParams): Promise<SendResult> {
    try {
      // 1. Rate limit kontrolü
      await this.checkRateLimit(params.to as string);

      // 2. Şablonu yükle ve render et
      const html = await this.renderTemplate(params.template, params.data);

      // 3. Resend ile gönder
      const recipients = Array.isArray(params.to) ? params.to : [params.to];
      const from = params.from || this.from;

      if (process.env.NODE_ENV !== 'production') {
        console.log('[EmailService] sending via Resend', {
          from,
          to: recipients,
          template: params.template,
          subject: params.subject,
        });
      }
      
      const result = await this.resend.emails.send({
        from,
        to: recipients,
        subject: params.subject,
        html,
        replyTo: params.replyTo,
      });

      const resendError = (result as any)?.error;
      if (resendError) {
        throw new Error(resendError.message || 'Resend send failed');
      }

      const resendId = (result as any)?.data?.id ?? (result as any)?.id;
      if (!resendId) {
        console.warn('Resend send returned no id:', result);
      }

      // 4. Başarıyı logla
      await EmailLogger.log({
        recipient: recipients[0],
        template: params.template,
        subject: params.subject,
        status: 'sent',
        resendId,
        data: params.data,
      });

      return {
        success: true,
        id: resendId,
      };
    } catch (error: any) {
      // Hatayı logla
      await EmailLogger.log({
        recipient: Array.isArray(params.to) ? params.to[0] : params.to,
        template: params.template,
        subject: params.subject,
        status: 'failed',
        error: error.message,
        data: params.data,
      });

      console.error('Email send failed:', error);
      
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * E-postayı kuyruğa ekle (batch gönderimler için)
   */
  async queueEmail(params: QueueEmailParams): Promise<void> {
    const supabase = createServiceRoleClient();

    await supabase.from('email_queue').insert({
      recipient: Array.isArray(params.to) ? params.to[0] : params.to,
      template: params.template,
      subject: params.subject,
      data: params.data,
      priority: params.priority || 'medium',
      scheduled_at: params.scheduledAt?.toISOString() || new Date().toISOString(),
      status: 'pending',
    });
  }

  /**
   * React Email şablonunu render et
   */
  private async renderTemplate(
    template: EmailTemplate,
    data: Record<string, any>
  ): Promise<string> {
    try {
      const { render } = await import('@react-email/render');
      
      // Template'i import et
      let TemplateComponent;
      
      switch (template) {
        case 'auth/password-reset':
          const { default: PasswordReset } = await import('./templates/auth/password-reset');
          TemplateComponent = PasswordReset;
          break;
        case 'auth/password-changed':
          const { default: PasswordChanged } = await import('./templates/auth/password-changed');
          TemplateComponent = PasswordChanged;
          break;
        case 'auth/otp-code':
          const { default: OtpCode } = await import('./templates/auth/otp-code');
          TemplateComponent = OtpCode;
          break;
        case 'orders/order-confirmation':
          const { default: OrderConfirmation } = await import(
            './templates/orders/order-confirmation'
          );
          TemplateComponent = OrderConfirmation;
          break;
        case 'orders/new-order-seller':
          const { default: NewOrderSeller } = await import(
            './templates/orders/new-order-seller'
          );
          TemplateComponent = NewOrderSeller;
          break;
        case 'orders/invoice-uploaded':
          const { default: InvoiceUploaded } = await import(
            './templates/orders/invoice-uploaded'
          );
          TemplateComponent = InvoiceUploaded;
          break;
        case 'orders/order-reminder-seller':
          const { default: OrderReminderSeller } = await import(
            './templates/orders/order-reminder-seller'
          );
          TemplateComponent = OrderReminderSeller;
          break;

        // Marketplace Templates
        case 'seller/application-approved':
          const { default: ApplicationApproved } = await import(
            './templates/seller/application-approved'
          );
          TemplateComponent = ApplicationApproved;
          break;
        case 'seller/application-rejected':
          const { default: ApplicationRejected } = await import(
            './templates/seller/application-rejected'
          );
          TemplateComponent = ApplicationRejected;
          break;
        case 'seller/withdrawal-processed':
          const { default: WithdrawalProcessed } = await import(
            './templates/seller/withdrawal-processed'
          );
          TemplateComponent = WithdrawalProcessed;
          break;
        case 'seller/weekly-payout-processed':
          const { default: WeeklyPayoutProcessed } = await import(
            '@/lib/email/templates/seller/weekly-payout-processed'
          );
          TemplateComponent = WeeklyPayoutProcessed;
          break;
        case 'store/product-approved':
          const { default: ProductApproved } = await import(
            './templates/store/product-approved'
          );
          TemplateComponent = ProductApproved;
          break;
        case 'store/product-rejected':
          const { default: ProductRejected } = await import(
            './templates/store/product-rejected'
          );
          TemplateComponent = ProductRejected;
          break;
        case 'store/new-order':
          const { default: NewOrder } = await import(
            './templates/store/new-order'
          );
          TemplateComponent = NewOrder;
          break;

        case 'admin/weekly-payout-summary':
          const { default: WeeklyPayoutSummary } = await import(
            '@/lib/email/templates/admin/weekly-payout-summary'
          );
          TemplateComponent = WeeklyPayoutSummary;
          break;

        case 'marketing/product-offer':
          const { default: ProductOffer } = await import(
            './templates/marketing/product-offer'
          );
          TemplateComponent = ProductOffer;
          break;

        case 'marketing/abandoned-cart':
          const { default: AbandonedCart } = await import(
            './templates/marketing/abandoned-cart'
          );
          TemplateComponent = AbandonedCart;
          break;

        case 'seller/weekly-insights':
          const { default: WeeklyInsights } = await import(
            './templates/seller/weekly-insights'
          );
          TemplateComponent = WeeklyInsights;
          break;

        case 'seller/store-invitation':
          const { default: StoreInvitation } = await import(
            './templates/seller/store-invitation'
          );
          TemplateComponent = StoreInvitation;
          break;

        default:
          throw new Error(`Unknown template: ${template}`);
      }
      
      return render((TemplateComponent as any)(data));
    } catch (error) {
      console.error(`Template render failed for ${template}:`, error);
      
      // Fallback: basit HTML
      return this.getFallbackTemplate(data);
    }
  }

  /**
   * Rate limit kontrolü
   */
  private async checkRateLimit(email: string): Promise<void> {
    const hourlyLimit = parseInt(process.env.EMAIL_RATE_LIMIT_HOURLY || '10');
    const dailyLimit = parseInt(process.env.EMAIL_RATE_LIMIT_DAILY || '50');

    // Son 1 saat kontrolü
    const hourlyCount = await EmailLogger.getRecentEmailCount(email, 60);
    if (hourlyCount >= hourlyLimit) {
      throw new Error(
        `Rate limit exceeded: ${hourlyCount}/${hourlyLimit} emails in last hour`
      );
    }

    // Son 24 saat kontrolü
    const dailyCount = await EmailLogger.getRecentEmailCount(email, 24 * 60);
    if (dailyCount >= dailyLimit) {
      throw new Error(
        `Rate limit exceeded: ${dailyCount}/${dailyLimit} emails in last 24 hours`
      );
    }
  }

  /**
   * Fallback template (şablon render edilemezse)
   */
  private getFallbackTemplate(data: Record<string, any>): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #333;">Novagross</h1>
          </div>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px;">
            <pre>${JSON.stringify(data, null, 2)}</pre>
          </div>
          <div style="margin-top: 30px; text-align: center; color: #666; font-size: 12px;">
            <p>Bu e-posta Novagross tarafından gönderilmiştir.</p>
            <p>Teknova tarafından işletilmektedir.</p>
            <p>Sorularınız için: ${process.env.CONTACT_EMAIL || 'info@novagross.com'}</p>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * E-posta tercihlerini kontrol et
   */
  async canSendEmail(
    userId: string,
    emailType: 'marketing' | 'transactional'
  ): Promise<boolean> {
    // Transactional her zaman gönderilebilir
    if (emailType === 'transactional') {
      return true;
    }

    const supabase = await createClient();

    const { data: prefs } = await supabase
      .from('email_preferences')
      .select('marketing, unsubscribed_all')
      .eq('user_id', userId)
      .single();

    if (!prefs) return true; // Tercih yoksa varsayılan olarak gönder

    return !Boolean(prefs.unsubscribed_all) && Boolean(prefs.marketing);
  }
}

// Singleton instance
let emailServiceInstance: EmailService | null = null;

export function getEmailService(): EmailService {
  if (!emailServiceInstance) {
    emailServiceInstance = new EmailService();
  }
  return emailServiceInstance;
}
